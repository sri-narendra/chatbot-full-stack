const express = require('express');
const router = express.Router();
const Chat = require('../models/Chat');
const { v4: uuidv4 } = require('uuid');
const { GoogleGenerativeAI } = require('@google/generative-ai');

// Configuration
const CONFIG = {
  MAX_RESPONSE_TOKENS: parseInt(process.env.MAX_RESPONSE_TOKENS) || 2000, // Default 2000 tokens
  MAX_HISTORY_MESSAGES: 5,
  REQUEST_TIMEOUT: 20000,
  TEMPERATURE: 0.7,
};

console.log('⚙️ Configuration:', CONFIG);

// Multiple Gemini API Keys for rotation
const API_KEYS = [
  process.env.GEMINI_API_KEY_1,
  process.env.GEMINI_API_KEY_2,
  process.env.GEMINI_API_KEY_3,
  process.env.GEMINI_API_KEY
].filter(key => key && key !== 'your-api-key-here');

console.log(`🔑 Loaded ${API_KEYS.length} Gemini API keys`);

// Track API key performance
let keyStatus = {};
let currentKeyIndex = 0;
let totalRequests = 0;
let successfulRequests = 0;
let failedRequests = 0;

// Initialize all API keys
function initializeApis() {
  const apis = [];
  
  API_KEYS.forEach((key, index) => {
    try {
      const genAI = new GoogleGenerativeAI(key);
      const model = genAI.getGenerativeModel({ 
        model: 'gemini-2.5-flash',
        generationConfig: {
          temperature: CONFIG.TEMPERATURE,
          maxOutputTokens: CONFIG.MAX_RESPONSE_TOKENS,
          topP: 0.8,
          topK: 40,
        }
      });
      
      keyStatus[index] = {
        available: true,
        lastUsed: null,
        errorCount: 0,
        successCount: 0,
        quotaExceeded: false,
        lastError: null
      };
      
      apis.push({ genAI, model, keyIndex: index });
      
    } catch (err) {
      console.error(`❌ Failed to initialize API key ${index + 1}:`, err.message);
      keyStatus[index] = {
        available: false,
        lastUsed: null,
        errorCount: 1,
        successCount: 0,
        quotaExceeded: false,
        lastError: err.message
      };
    }
  });
  
  return apis;
}

const apis = initializeApis();
console.log(`✅ Initialized ${apis.length} Gemini API instances`);

// Get next available API key
function getNextApi() {
  // Try current key first if available
  if (apis[currentKeyIndex] && keyStatus[currentKeyIndex].available && !keyStatus[currentKeyIndex].quotaExceeded) {
    return apis[currentKeyIndex];
  }
  
  // Find next available key
  for (let i = 0; i < apis.length; i++) {
    const nextIndex = (currentKeyIndex + i + 1) % apis.length;
    if (apis[nextIndex] && keyStatus[nextIndex].available && !keyStatus[nextIndex].quotaExceeded) {
      currentKeyIndex = nextIndex;
      return apis[nextIndex];
    }
  }
  
  // Check for keys with quota exceeded but not other errors
  for (let i = 0; i < apis.length; i++) {
    if (apis[i] && keyStatus[i].available && keyStatus[i].quotaExceeded) {
      currentKeyIndex = i;
      return apis[i];
    }
  }
  
  return null;
}

// Update key status
function updateKeyStatus(keyIndex, success, error = null, quotaExceeded = false) {
  if (!keyStatus[keyIndex]) return;
  
  if (success) {
    keyStatus[keyIndex].successCount++;
    keyStatus[keyIndex].errorCount = 0;
    keyStatus[keyIndex].lastError = null;
    keyStatus[keyIndex].lastUsed = new Date();
  } else {
    keyStatus[keyIndex].errorCount++;
    keyStatus[keyIndex].lastError = error;
    keyStatus[keyIndex].lastUsed = new Date();
    
    if (quotaExceeded) {
      keyStatus[keyIndex].quotaExceeded = true;
      console.log(`🚫 API Key ${keyIndex + 1} quota exceeded`);
    }
    
    // If too many errors, temporarily disable the key
    if (keyStatus[keyIndex].errorCount > 5) {
      keyStatus[keyIndex].available = false;
      console.log(`⚠️ Temporarily disabled API Key ${keyIndex + 1} due to ${keyStatus[keyIndex].errorCount} errors`);
      
      // Re-enable after 5 minutes
      setTimeout(() => {
        keyStatus[keyIndex].available = true;
        keyStatus[keyIndex].errorCount = 0;
        console.log(`✅ Re-enabled API Key ${keyIndex + 1}`);
      }, 5 * 60 * 1000);
    }
  }
}

// Truncate response if too long (server-side safety)
function truncateResponse(text, maxTokens = CONFIG.MAX_RESPONSE_TOKENS) {
  // Rough estimate: 1 token ≈ 4 characters for English
  const maxChars = maxTokens * 4;
  
  if (text.length <= maxChars) {
    return text;
  }
  
  // Truncate and add ellipsis
  const truncated = text.substring(0, maxChars);
  // Try to cut at sentence end
  const lastPeriod = truncated.lastIndexOf('.');
  const lastQuestion = truncated.lastIndexOf('?');
  const lastExclamation = truncated.lastIndexOf('!');
  const cutPoint = Math.max(lastPeriod, lastQuestion, lastExclamation);
  
  if (cutPoint > maxChars * 0.8) {
    return truncated.substring(0, cutPoint + 1) + ' [Response truncated due to length limit]';
  }
  
  return truncated + '... [Response truncated due to length limit]';
}

// Call Gemini API with retry logic
async function callGeminiApi(userMessage, history) {
  let lastError = null;
  let attempts = 0;
  const maxAttempts = Math.min(apis.length * 2, 5);
  
  while (attempts < maxAttempts) {
    attempts++;
    const api = getNextApi();
    
    if (!api) {
      lastError = 'No available API keys';
      break;
    }
    
    const { model, keyIndex } = api;
    
    try {
      console.log(`🔑 Using API Key ${keyIndex + 1} (Attempt ${attempts}/${maxAttempts})`);
      
      const formattedHistory = history.map(msg => ({
        role: msg.role === 'user' ? 'user' : 'model',
        parts: [{ text: msg.content }]
      }));
      
      formattedHistory.push({
        role: 'user',
        parts: [{ text: userMessage }]
      });
      
      const result = await Promise.race([
        model.generateContent({
          contents: formattedHistory,
          generationConfig: {
            temperature: CONFIG.TEMPERATURE,
            maxOutputTokens: CONFIG.MAX_RESPONSE_TOKENS,
            topP: 0.8,
            topK: 40,
          }
        }),
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('API timeout')), CONFIG.REQUEST_TIMEOUT)
        )
      ]);
      
      if (result && result.response) {
        let responseText = result.response.text();
        
        // Truncate if response is too long (safety measure)
        responseText = truncateResponse(responseText);
        
        updateKeyStatus(keyIndex, true);
        successfulRequests++;
        
        return {
          success: true,
          text: responseText,
          keyIndex: keyIndex,
          attempts: attempts,
          truncated: responseText !== result.response.text()
        };
      } else {
        throw new Error('No response from Gemini');
      }
      
    } catch (error) {
      lastError = error.message;
      console.error(`❌ API Key ${keyIndex + 1} failed:`, error.message);
      
      const isQuotaError = error.message.includes('quota') || 
                          error.message.includes('429') ||
                          error.message.includes('exceeded');
      const isAuthError = error.message.includes('API key') || 
                         error.message.includes('permission') ||
                         error.message.includes('authentication');
      const isLengthError = error.message.includes('length') || 
                           error.message.includes('token') ||
                           error.message.includes('too long');
      
      updateKeyStatus(keyIndex, false, error.message, isQuotaError);
      
      if (isAuthError) {
        keyStatus[keyIndex].available = false;
        console.log(`🔒 Permanently disabled API Key ${keyIndex + 1} due to auth error`);
      }
      
      // If it's a length error, reduce the max tokens for next attempt
      if (isLengthError && CONFIG.MAX_RESPONSE_TOKENS > 500) {
        CONFIG.MAX_RESPONSE_TOKENS = Math.floor(CONFIG.MAX_RESPONSE_TOKENS * 0.8);
        console.log(`📉 Reduced max response tokens to ${CONFIG.MAX_RESPONSE_TOKENS} due to length error`);
      }
      
      failedRequests++;
      
      if (attempts < maxAttempts) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }
  }
  
  return {
    success: false,
    error: lastError || 'All API attempts failed',
    attempts: attempts
  };
}

/* ================================
   SEND MESSAGE
================================ */
router.post('/', async (req, res) => {
  try {
    let { message, sessionId, maxTokens } = req.body;

    if (!message || typeof message !== 'string') {
      return res.status(400).json({ 
        error: 'Message is required and must be a string' 
      });
    }

    message = message.trim();
    if (message.length === 0) {
      return res.status(400).json({ 
        error: 'Message cannot be empty' 
      });
    }

    if (!sessionId || typeof sessionId !== 'string') {
      sessionId = uuidv4();
    }

    // Allow client to override max tokens
    if (maxTokens && !isNaN(maxTokens)) {
      maxTokens = parseInt(maxTokens);
      if (maxTokens > 0 && maxTokens <= 8192) {
        CONFIG.MAX_RESPONSE_TOKENS = maxTokens;
      }
    }

    await Chat.create({
      sessionId,
      role: 'user',
      content: message
    });

    let replyText = '';
    let source = 'error';
    let keyUsed = -1;
    let attempts = 0;
    let quotaExceeded = false;
    let truncated = false;

    const availableKeys = Object.values(keyStatus).filter(
      status => status.available && !status.quotaExceeded
    ).length;
    
    if (availableKeys > 0 && apis.length > 0) {
      totalRequests++;
      
      const history = await Chat.find({ sessionId })
        .sort({ createdAt: 1 })
        .limit(CONFIG.MAX_HISTORY_MESSAGES);
      
      const result = await callGeminiApi(message, history);
      attempts = result.attempts;
      
      if (result.success) {
        replyText = result.text;
        source = 'gemini';
        keyUsed = result.keyIndex;
        quotaExceeded = false;
        truncated = result.truncated || false;
      } else {
        const allQuotaExceeded = Object.values(keyStatus).every(
          status => status.quotaExceeded || !status.available
        );
        
        if (allQuotaExceeded) {
          replyText = '⚠️ All Gemini API keys have exceeded their quota. Please try again later or add more API keys.';
          source = 'quota_exceeded';
          quotaExceeded = true;
        } else {
          replyText = `⚠️ Gemini API failed after ${attempts} attempts. ${result.error}`;
          source = 'api_error';
          quotaExceeded = false;
        }
      }
    } else {
      if (apis.length === 0) {
        replyText = '⚠️ No Gemini API keys configured. Please add API keys to your .env file.';
        source = 'no_keys';
      } else {
        const quotaCount = Object.values(keyStatus).filter(s => s.quotaExceeded).length;
        const disabledCount = Object.values(keyStatus).filter(s => !s.available).length;
        
        replyText = `⚠️ All Gemini API keys are unavailable. ${quotaCount} keys have quota exceeded, ${disabledCount} keys are disabled.`;
        source = 'all_unavailable';
        quotaExceeded = true;
      }
    }

    await Chat.create({
      sessionId,
      role: 'assistant',
      content: replyText
    });

    res.json({
      sessionId,
      reply: replyText,
      timestamp: new Date().toISOString(),
      source: source,
      keyUsed: keyUsed,
      attempts: attempts,
      quotaExceeded: quotaExceeded,
      truncated: truncated,
      maxTokens: CONFIG.MAX_RESPONSE_TOKENS,
      availableKeys: availableKeys,
      totalKeys: apis.length
    });

  } catch (err) {
    console.error('🔥 Server Error:', err);
    
    const errorResponse = '⚠️ Server error. Please try again.';
    
    res.status(500).json({ 
      sessionId: req.body.sessionId || uuidv4(),
      reply: errorResponse,
      error: 'Internal server error',
      source: 'server_error'
    });
  }
});

/* ================================
   GET ALL SESSIONS (SIDEBAR)
================================ */
router.get('/sessions', async (req, res) => {
  try {
    const sessionIds = await Chat.distinct('sessionId');
    const sessions = [];
    
    for (const sessionId of sessionIds.slice(0, 50)) {
      const firstUserMessage = await Chat.findOne({
        sessionId: sessionId,
        role: 'user'
      }).sort({ createdAt: 1 });
      
      const latestMessage = await Chat.findOne({
        sessionId: sessionId
      }).sort({ createdAt: -1 });
      
      const messageCount = await Chat.countDocuments({ sessionId: sessionId });
      
      let sessionTitle = 'New Chat';
      if (firstUserMessage && firstUserMessage.content) {
        const content = firstUserMessage.content;
        sessionTitle = content.length > 40 
          ? content.substring(0, 40) + '...' 
          : content;
      }
      
      sessions.push({
        _id: sessionId,
        lastMessage: sessionTitle,
        updatedAt: latestMessage ? latestMessage.createdAt : new Date(),
        messageCount: messageCount
      });
    }
    
    sessions.sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));
    
    res.json(sessions);
  } catch (err) {
    console.error('Session fetch error:', err);
    res.status(500).json({ 
      error: 'Failed to load sessions',
      message: err.message 
    });
  }
});

/* ================================
   GET CHAT HISTORY BY SESSION ID
================================ */
router.get('/history/:sessionId', async (req, res) => {
  try {
    const { sessionId } = req.params;
    
    if (!sessionId || typeof sessionId !== 'string') {
      return res.status(400).json({ 
        error: 'Valid session ID is required' 
      });
    }

    const chats = await Chat.find({
      sessionId: sessionId
    })
    .sort({ createdAt: 1 })
    .select('role content createdAt')
    .lean();

    res.json(chats);
  } catch (err) {
    console.error('History fetch error:', err);
    res.status(500).json({ 
      error: 'Failed to load chat history',
      message: err.message 
    });
  }
});

/* ================================
   DELETE CHAT SESSION
================================ */
router.delete('/session/:sessionId', async (req, res) => {
  try {
    const { sessionId } = req.params;
    
    if (!sessionId) {
      return res.status(400).json({ 
        error: 'Session ID is required' 
      });
    }

    const result = await Chat.deleteMany({ sessionId: sessionId });
    
    res.json({ 
      success: true, 
      message: `Deleted ${result.deletedCount} messages from session`,
      deletedCount: result.deletedCount,
      sessionId: sessionId
    });
  } catch (err) {
    console.error('Delete session error:', err);
    res.status(500).json({ 
      error: 'Failed to delete session',
      message: err.message 
    });
  }
});

/* ================================
   UPDATE MESSAGE CONTENT (for editing)
================================ */
router.put('/message/:messageId', async (req, res) => {
  try {
    const { messageId } = req.params;
    const { content } = req.body;
    
    if (!messageId || !content || typeof content !== 'string') {
      return res.status(400).json({ 
        error: 'Message ID and content are required' 
      });
    }

    const updatedMessage = await Chat.findByIdAndUpdate(
      messageId,
      { content: content.trim() },
      { new: true }
    );
    
    if (!updatedMessage) {
      return res.status(404).json({ 
        error: 'Message not found' 
      });
    }
    
    res.json({ 
      success: true, 
      message: 'Message updated successfully',
      updatedMessage: updatedMessage
    });
  } catch (err) {
    console.error('Update message error:', err);
    res.status(500).json({ 
      error: 'Failed to update message',
      message: err.message 
    });
  }
});

/* ================================
   GET API STATUS & CONFIG
================================ */
router.get('/status', (req, res) => {
  const availableKeys = Object.values(keyStatus).filter(
    status => status.available && !status.quotaExceeded
  ).length;
  
  const quotaExceededKeys = Object.values(keyStatus).filter(
    status => status.quotaExceeded
  ).length;
  
  const disabledKeys = Object.values(keyStatus).filter(
    status => !status.available
  ).length;
  
  const keyDetails = Object.entries(keyStatus).map(([index, status]) => ({
    keyIndex: parseInt(index) + 1,
    available: status.available,
    quotaExceeded: status.quotaExceeded,
    errorCount: status.errorCount,
    successCount: status.successCount,
    lastUsed: status.lastUsed,
    lastError: status.lastError
  }));
  
  res.json({
    totalKeys: apis.length,
    availableKeys: availableKeys,
    quotaExceededKeys: quotaExceededKeys,
    disabledKeys: disabledKeys,
    totalRequests: totalRequests,
    successfulRequests: successfulRequests,
    failedRequests: failedRequests,
    successRate: totalRequests > 0 ? (successfulRequests / totalRequests * 100).toFixed(2) : 0,
    configuration: {
      maxResponseTokens: CONFIG.MAX_RESPONSE_TOKENS,
      maxHistoryMessages: CONFIG.MAX_HISTORY_MESSAGES,
      temperature: CONFIG.TEMPERATURE,
      requestTimeout: CONFIG.REQUEST_TIMEOUT
    },
    keyDetails: keyDetails,
    status: availableKeys > 0 ? 'operational' : (quotaExceededKeys > 0 ? 'quota_exceeded' : 'unavailable'),
    timestamp: new Date().toISOString()
  });
});

/* ================================
   UPDATE CONFIGURATION
================================ */
router.put('/config', (req, res) => {
  try {
    const { maxResponseTokens, maxHistoryMessages, temperature } = req.body;
    
    if (maxResponseTokens && !isNaN(maxResponseTokens)) {
      const tokens = parseInt(maxResponseTokens);
      if (tokens >= 100 && tokens <= 8192) {
        CONFIG.MAX_RESPONSE_TOKENS = tokens;
      }
    }
    
    if (maxHistoryMessages && !isNaN(maxHistoryMessages)) {
      const messages = parseInt(maxHistoryMessages);
      if (messages >= 1 && messages <= 50) {
        CONFIG.MAX_HISTORY_MESSAGES = messages;
      }
    }
    
    if (temperature && !isNaN(temperature)) {
      const temp = parseFloat(temperature);
      if (temp >= 0 && temp <= 1) {
        CONFIG.TEMPERATURE = temp;
      }
    }
    
    res.json({
      success: true,
      message: 'Configuration updated',
      configuration: CONFIG,
      timestamp: new Date().toISOString()
    });
  } catch (err) {
    console.error('Config update error:', err);
    res.status(500).json({ 
      error: 'Failed to update configuration',
      message: err.message 
    });
  }
});

module.exports = router;