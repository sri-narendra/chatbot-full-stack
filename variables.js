// Configuration
const API_BASE = 'https://chatbot-full-stack.onrender.com';
let sessionId = localStorage.getItem('sessionId');
let isSending = false;
let apiStatus = 'checking';
let sidebarExpanded = localStorage.getItem('sidebarExpanded') !== 'false';
let sessionToDelete = null;
let deleteMode = 'session';

// Voice Search
let isListening = false;
let recognition = null;
let voiceTranscript = '';
let finalTranscript = '';
let voiceSettings = {
    language: localStorage.getItem('voiceLanguage') || 'en-US',
    continuous: localStorage.getItem('continuousListening') === 'true'
};

// Settings
let settings = {
    maxTokens: parseInt(localStorage.getItem('maxTokens')) || 2000,
    historyMessages: parseInt(localStorage.getItem('historyMessages')) || 5,
    temperature: parseFloat(localStorage.getItem('temperature')) || 0.7
};

// DOM Elements
const sidebar = document.getElementById('sidebar');
const deleteModal = document.getElementById('deleteModal');
const deleteModalText = document.getElementById('deleteModalText');
const settingsModal = document.getElementById('settingsModal');
const chatBox = document.getElementById('chatBox');
const voiceVisualizer = document.getElementById('voiceVisualizer');
const voiceStatus = document.getElementById('voiceStatus');
const voiceStatusText = document.getElementById('voiceStatusText');
const voiceTranscriptEl = document.getElementById('voiceTranscript');
const voiceWave = document.getElementById('voiceWave');
const voiceInstruction = document.getElementById('voiceInstruction');

const voiceBtn = document.getElementById('voiceBtn');
