'use client';

import { useState, useEffect, useCallback } from 'react';
import { CodeBracketIcon, ClipboardDocumentIcon, LanguageIcon, ArrowDownTrayIcon, ArrowUpTrayIcon, ArrowLeftIcon, Cog6ToothIcon, PhotoIcon, XMarkIcon } from '@heroicons/react/24/outline';
import { ScriptPreset } from '@/lib/scriptLoader';

// Global Pyodide type
declare global {
  interface Window {
    loadPyodide: any;
  }
}

interface ChatMessage {
  id: string;
  type: 'user' | 'bot';
  content: string;
  timestamp: Date;
  encoding?: string;
  isEncoded?: boolean;
  isError?: boolean;
}

interface ChatClientProps {
  initialScripts: Record<string, ScriptPreset>;
}

const translations = {
  en: {
    title: 'Colorful Encode',
    subtitle: 'Script-Powered Encoder',
    newScript: 'New Script',
    ready: 'Ready',
    pythonReady: 'Python Ready',
    loadingPython: 'Loading Python...',
    tsReady: 'TypeScript Ready',
    startEncoding: 'Start encoding with custom scripts!',
    enterText: 'Enter text below and choose Encode or Decode.',
    typePlaceholder: 'Type text here...',
    encode: 'Encode',
    decode: 'Decode',
    clearChat: 'Clear Chat',
    copy: 'Copy',
    editScript: 'Edit Script',
    createNewScript: 'Create New Script',
    name: 'Name',
    avatar: 'Avatar (Emoji)',
    description: 'Description',
    language: 'Language',
    scriptCode: 'Script Code',
    typescriptCode: 'TypeScript Code',
    pythonCode: 'Python Code',
    codeHintTS: 'Must define <code>encode(text)</code> and <code>decode(text)</code> functions. Async functions are supported.',
    codeHintPy: 'Must define <code>encode(text)</code> and <code>decode(text)</code> functions.',
    cancel: 'Cancel',
    saveScript: 'Save Script',
    confirmClear: 'Clear chat history with {name}?',
    confirmDelete: 'Delete this script?',
    nameRequired: 'Name required',
    original: 'Original:',
    encoded: 'Encoded:',
    viewEditCode: 'View/Edit Code',
    myScriptPlaceholder: 'My Script',
    descPlaceholder: 'What does this script do?',
    defaultScriptName: 'New Script',
    defaultScriptDesc: 'Custom encoding script',
    exportChat: 'Export Chat',
    exportAll: 'Export All',
    importChat: 'Import Chat',
    noData: 'No data to export',
    importSuccess: 'Import successful!',
    importFailed: 'Import failed: ',
    importNoValidData: 'No valid chat records found for existing bots.',
    scriptLanguage: 'Script Language',
    uploadImage: 'Upload Image',
    uploadImageDesc: 'Select a local image as the carrier for steganography',
    imageUploaded: 'Image loaded:',
    clearImage: 'Clear',
    imageSizeHint: 'Larger images can hide more text'
  },
  zh: {
    title: 'Colorful Encode',
    subtitle: '脚本驱动的编码器',
    newScript: '新建脚本',
    ready: '就绪',
    pythonReady: 'Python 就绪',
    loadingPython: '正在加载 Python...',
    tsReady: 'TypeScript 就绪',
    startEncoding: '开始使用自定义脚本编码！',
    enterText: '在下方输入文本并选择编码或解码。',
    typePlaceholder: '在此输入文本...',
    encode: '编码',
    decode: '解码',
    clearChat: '清空对话',
    copy: '复制',
    editScript: '编辑脚本',
    createNewScript: '创建新脚本',
    name: '名称',
    avatar: '图标 (Emoji)',
    description: '描述',
    language: '语言',
    scriptCode: '脚本代码',
    typescriptCode: 'TypeScript 代码',
    pythonCode: 'Python 代码',
    codeHintTS: '必须定义 <code>encode(text)</code> 和 <code>decode(text)</code> 函数。支持 async 异步函数。',
    codeHintPy: '必须定义 <code>encode(text)</code> 和 <code>decode(text)</code> 函数。',
    cancel: '取消',
    saveScript: '保存脚本',
    confirmClear: '清空与 {name} 的对话历史？',
    confirmDelete: '删除此脚本？',
    nameRequired: '请输入名称',
    original: '原文:',
    encoded: '编码:',
    viewEditCode: '查看/编辑代码',
    myScriptPlaceholder: '我的脚本',
    descPlaceholder: '这个脚本是做什么的？',
    defaultScriptName: '新脚本',
    defaultScriptDesc: '自定义编码脚本',
    exportChat: '导出当前对话',
    exportAll: '导出全部记录',
    importChat: '导入记录',
    noData: '暂无数据可导出',
    importSuccess: '导入成功！',
    importFailed: '导入失败：',
    importNoValidData: '未找到现有 Bot 的有效聊天记录。',
    scriptLanguage: '脚本语言',
    uploadImage: '上传图片',
    uploadImageDesc: '选择本地图片作为隐写载体',
    imageUploaded: '已加载图片:',
    clearImage: '清除',
    imageSizeHint: '更大的图片可以隐藏更多文字'
  }
};

// Check if text is an image data URL or image path (absolute or relative)
function isImageContent(text: string): boolean {
  if (text.startsWith('data:image/')) return true;
  if (/^https?:\/\/.*\.(jpg|jpeg|png|gif|webp)(\?.*)?$/i.test(text)) return true;
  // Relative or root-relative image paths, e.g. "/default_image.jpg" or "default_image.jpg"
  if (/^\/?[\w\-./%]+\.(jpg|jpeg|png|gif|webp)$/i.test(text)) return true;
  return false;
}

// Detect if a code string is likely Python
function detectLanguage(code: string): 'typescript' | 'python' {
  if (
    code.includes('def encode(') ||
    code.includes('def decode(') ||
    code.match(/^import\s+/m) ||
    code.match(/^from\s+\S+\s+import/m)
  ) {
    return 'python';
  }
  return 'typescript';
}

// AsyncFunction constructor for running TS/JS scripts
const AsyncFunction = Object.getPrototypeOf(async function () { /* noop */ }).constructor as FunctionConstructor;

export default function ChatClient({ initialScripts }: ChatClientProps) {
  // Use the first available script as default or fallback
  const firstScriptKey = Object.keys(initialScripts)[0];
  const [selectedFriend, setSelectedFriend] = useState<string>('');

  // Set default selection for desktop on mount
  useEffect(() => {
    if (window.innerWidth >= 768 && !selectedFriend) {
      setSelectedFriend(firstScriptKey || 'base64');
    }
  }, []);

  const [inputText, setInputText] = useState('');
  const [chatHistory, setChatHistory] = useState<{ [friendId: string]: ChatMessage[] }>({});
  const [userScripts, setUserScripts] = useState<{ [key: string]: ScriptPreset }>({});
  const [lastUsedMap, setLastUsedMap] = useState<Record<string, number>>({});

  // Script Configuration State
  const [scriptConfigs, setScriptConfigs] = useState<Record<string, Record<string, any>>>({});
  const [showSettings, setShowSettings] = useState(false);
  const [currentSchema, setCurrentSchema] = useState<any>(null);

  // Key History State
  interface KeyPairHistory {
    id: string;
    timestamp: number;
    sourceName: string;
    keys: Record<string, string>;
  }
  const [keyHistory, setKeyHistory] = useState<KeyPairHistory[]>([]);
  const [showKeyHistory, setShowKeyHistory] = useState(false);

  // Image upload state (for steganography)
  const [uploadedImagePreview, setUploadedImagePreview] = useState<string | null>(null);
  const [uploadedFileName, setUploadedFileName] = useState<string>('');

  const [lang, setLang] = useState<'en' | 'zh'>('en');

  const t = translations[lang];

  // Script Editing State
  const [showEditScript, setShowEditScript] = useState(false);
  const [editingKey, setEditingKey] = useState<string | null>(null);
  const [editingScript, setEditingScript] = useState<ScriptPreset>({
    id: '',
    name: '',
    description: '',
    avatar: '📜',
    code: '',
    language: 'typescript'
  });

  // Pyodide State (only loaded when needed for Python scripts)
  const [pyodide, setPyodide] = useState<any>(null);
  const [isPyodideReady, setIsPyodideReady] = useState(false);
  const [isPyodideLoading, setIsPyodideLoading] = useState(false);
  const [pyodideError, setPyodideError] = useState<string | null>(null);

  // TypeScript is always ready (no loading needed)
  const isTypeScriptReady = true;

  // Check if current script needs Python
  const currentScript = initialScripts[selectedFriend] || userScripts[selectedFriend] || {
    id: 'unknown',
    name: 'Unknown Script',
    description: 'Script not found',
    avatar: '❓',
    code: '',
    language: 'typescript' as const
  };

  const needsPython = currentScript?.language === 'python';
  const isReady = needsPython ? isPyodideReady : isTypeScriptReady;

  // Image steganography scripts get an image upload / decode-from-image UI
  const isStegoScript = currentScript?.id === 'steganography';

  // Load Pyodide lazily (only when a Python script is selected)
  const loadPyodide = useCallback(async () => {
    if (pyodide || isPyodideLoading) return;
    setIsPyodideLoading(true);
    setPyodideError(null);

    try {
      // Load pyodide script dynamically
      if (!window.loadPyodide) {
        await new Promise<void>((resolve, reject) => {
          const script = document.createElement('script');
          script.src = 'https://cdn.jsdelivr.net/pyodide/v0.25.0/full/pyodide.js';
          script.onload = () => resolve();
          script.onerror = () => reject(new Error('Failed to load Pyodide script'));
          document.head.appendChild(script);
        });
      }

      const py = await window.loadPyodide();
      try {
        await py.loadPackage("pycryptodome");
      } catch (e) {
        console.warn("Failed to load pycryptodome, some Python scripts may not work", e);
      }
      setPyodide(py);
      setIsPyodideReady(true);
      console.log("Pyodide loaded successfully");
    } catch (e: any) {
      console.error("Failed to load Pyodide", e);
      setPyodideError("Failed to load Python: " + (e.message || String(e)));
    } finally {
      setIsPyodideLoading(false);
    }
  }, [pyodide, isPyodideLoading]);

  // Auto-load pyodide when a Python script is selected
  useEffect(() => {
    if (needsPython && !isPyodideReady && !isPyodideLoading) {
      loadPyodide();
    }
  }, [needsPython, isPyodideReady, isPyodideLoading, loadPyodide]);

  // Load User Scripts and History
  useEffect(() => {
    const savedScripts = localStorage.getItem('userScripts');
    if (savedScripts) {
      try {
        const parsed = JSON.parse(savedScripts);
        // Ensure all scripts have a language field
        Object.keys(parsed).forEach(key => {
          if (!parsed[key].language) {
            parsed[key].language = detectLanguage(parsed[key].code || '');
          }
        });
        setUserScripts(parsed);
      } catch (e) {
        console.error('Failed to load user scripts:', e);
      }
    }

    const savedChatHistory = localStorage.getItem('chatHistory');
    if (savedChatHistory) {
      try {
        const parsedHistory = JSON.parse(savedChatHistory);
        const restoredHistory: { [friendId: string]: ChatMessage[] } = {};
        Object.keys(parsedHistory).forEach(friendId => {
          restoredHistory[friendId] = parsedHistory[friendId].map((msg: ChatMessage) => ({
            ...msg,
            timestamp: new Date(msg.timestamp)
          }));
        });
        setChatHistory(restoredHistory);
      } catch (e) {
        console.error('Failed to load chat history:', e);
      }
    }

    const savedUsage = localStorage.getItem('scriptUsageHistory');
    if (savedUsage) {
      try {
        setLastUsedMap(JSON.parse(savedUsage));
      } catch (e) {
        console.error('Failed to load usage history:', e);
      }
    }

    // Load Script Configs
    const savedConfigs = localStorage.getItem('scriptConfigs');
    if (savedConfigs) {
      try {
        const parsedConfigs = JSON.parse(savedConfigs);
        setScriptConfigs(parsedConfigs);
        // Restore uploaded image preview for steganography script
        const stegoConfig = parsedConfigs['steganography'];
        if (stegoConfig?.image_url && stegoConfig.image_url.startsWith('data:image/')) {
          setUploadedImagePreview(stegoConfig.image_url);
        }
      } catch (e) {
        console.error('Failed to load script configs:', e);
      }
    }

    // Load Key History
    const savedKeys = localStorage.getItem('keyPairHistory');
    if (savedKeys) {
      try {
        setKeyHistory(JSON.parse(savedKeys));
      } catch (e) {
        console.error('Failed to load key history:', e);
      }
    }

    // Load Language Preference
    const savedLang = localStorage.getItem('languagePreference');
    if (savedLang === 'en' || savedLang === 'zh') {
      setLang(savedLang);
    }
  }, []);

  const toggleLanguage = () => {
    const newLang = lang === 'en' ? 'zh' : 'en';
    setLang(newLang);
    localStorage.setItem('languagePreference', newLang);
  };

  const updateLastUsed = (id: string) => {
    const newMap = {
      ...lastUsedMap,
      [id]: Date.now()
    };
    setLastUsedMap(newMap);
    localStorage.setItem('scriptUsageHistory', JSON.stringify(newMap));
  };

  const handleSelectFriend = (id: string) => {
    setSelectedFriend(id);
    updateLastUsed(id);
  };

  const saveUserScripts = (scripts: typeof userScripts) => {
    setUserScripts(scripts);
    localStorage.setItem('userScripts', JSON.stringify(scripts));
  };

  // Persisted placeholder for image messages that are too large for localStorage
  const IMAGE_HISTORY_PLACEHOLDER = '[图片消息：内容过大，未保存到历史记录]';

  // Save chat history to localStorage, stripping oversized image payloads
  // (encoded images can be several MB as data URLs and would otherwise throw
  // QuotaExceededError, breaking the encode/decode flow). Full content stays
  // available in memory for the current session.
  const saveChatHistory = (history: { [friendId: string]: ChatMessage[] }) => {
    try {
      const slim: { [friendId: string]: ChatMessage[] } = {};
      Object.keys(history).forEach(friendId => {
        slim[friendId] = history[friendId].map(msg =>
          msg.content && msg.content.length > 100000
            ? { ...msg, content: IMAGE_HISTORY_PLACEHOLDER }
            : msg
        );
      });
      localStorage.setItem('chatHistory', JSON.stringify(slim));
    } catch (e) {
      console.warn('Chat history too large for localStorage, keeping in memory only:', e);
    }
  };

  const updateMessages = (newMessages: ChatMessage[]) => {
    const newChatHistory = {
      ...chatHistory,
      [selectedFriend]: newMessages
    };
    setChatHistory(newChatHistory);
    saveChatHistory(newChatHistory);
  };

  const messages = chatHistory[selectedFriend] || [];

  // ============ TypeScript Script Execution ============

  const runTypeScriptScript = async (code: string, functionName: 'encode' | 'decode', input: string): Promise<string> => {
    const config = scriptConfigs[currentScript.id] || {};
    const wrappedCode = `
      "use strict";
      const SCRIPT_CONFIG = ${JSON.stringify(config)};
      ${code}
      if (typeof ${functionName} !== 'function') throw new Error('Function ${functionName} is not defined');
      return await ${functionName}(${JSON.stringify(input)});
    `;
    try {
      const fn = new AsyncFunction(wrappedCode);
      const result = await fn();
      return String(result);
    } catch (e: any) {
      throw new Error(e.message || String(e));
    }
  };

  const loadTypeScriptSchema = async (code: string): Promise<any> => {
    const wrappedCode = `
      "use strict";
      ${code}
      if (typeof get_config_schema === 'function') {
        const result = get_config_schema();
        if (typeof result === 'string') return JSON.parse(result);
        return result;
      }
      return null;
    `;
    try {
      const fn = new AsyncFunction(wrappedCode);
      return await fn();
    } catch (e) {
      console.error("Failed to load TS schema:", e);
      return null;
    }
  };

  const runTypeScriptAction = async (code: string, actionName: string): Promise<any> => {
    const config = scriptConfigs[currentScript.id] || {};
    const wrappedCode = `
      "use strict";
      const SCRIPT_CONFIG = ${JSON.stringify(config)};
      ${code}
      if (typeof ${actionName} !== 'function') throw new Error('Action ${actionName} is not defined');
      const result = await ${actionName}();
      if (typeof result === 'string') {
        try { return JSON.parse(result); } catch(e) { return result; }
      }
      return result;
    `;
    try {
      const fn = new AsyncFunction(wrappedCode);
      return await fn();
    } catch (e: any) {
      throw new Error(e.message || String(e));
    }
  };

  // ============ Python Script Execution (via Pyodide) ============

  const runPythonScript = async (code: string, functionName: 'encode' | 'decode', input: string): Promise<string> => {
    if (!pyodide || !isPyodideReady) {
      throw new Error("Python environment not ready");
    }

    try {
      // Clean up previous definitions
      pyodide.runPython(`
for key in ['get_config_schema', 'encode', 'decode', 'SCRIPT_CONFIG']:
    if key in globals():
        del globals()[key]
`);

      await pyodide.runPythonAsync(code);

      // Inject Config
      const config = scriptConfigs[currentScript.id] || {};
      const configJson = JSON.stringify(config);
      pyodide.globals.set("SCRIPT_CONFIG_JSON", configJson);
      await pyodide.runPythonAsync(`
import json
try:
    SCRIPT_CONFIG = json.loads(SCRIPT_CONFIG_JSON)
except:
    SCRIPT_CONFIG = {}
`);

      pyodide.globals.set("input_text", input);
      const result = await pyodide.runPythonAsync(`${functionName}(input_text)`);
      return String(result);
    } catch (e: any) {
      let friendlyMsg = e.message || String(e);

      const errorMatch = friendlyMsg.match(/\w*(?:Error|Exception):\s*(.*)/);
      if (errorMatch && errorMatch[1]) {
        friendlyMsg = errorMatch[1].trim();
      } else {
        const lines = friendlyMsg.trim().split('\n');
        if (lines.length > 0) {
          friendlyMsg = lines[lines.length - 1];
        }
      }

      throw new Error(friendlyMsg);
    }
  };

  // ============ Unified Schema Loading ============

  const loadSchema = async () => {
    setCurrentSchema(null);

    if (!currentScript.code) return;

    try {
      if (currentScript.language === 'typescript') {
        const schema = await loadTypeScriptSchema(currentScript.code);
        setCurrentSchema(schema);
      } else {
        // Python
        if (!pyodide || !isPyodideReady) return;

        pyodide.runPython(`
for key in ['get_config_schema', 'encode', 'decode', 'SCRIPT_CONFIG']:
    if key in globals():
        del globals()[key]
`);
        await pyodide.runPythonAsync(currentScript.code);

        const hasSchema = pyodide.runPython(" 'get_config_schema' in globals() ");
        if (hasSchema) {
          const schemaJson = await pyodide.runPythonAsync("get_config_schema()");
          let schema = schemaJson;
          if (typeof schema === 'string') {
            schema = JSON.parse(schema);
          } else if (schema && typeof schema.toJs === 'function') {
            schema = schema.toJs();
          }
          setCurrentSchema(schema);
        }
      }
    } catch (e) {
      console.error("Failed to load schema:", e);
      setCurrentSchema(null);
    }
  };

  useEffect(() => {
    loadSchema();
  }, [currentScript.id, isPyodideReady]);

  // Restore uploaded image preview when switching to steganography script
  useEffect(() => {
    if (currentScript.id === 'steganography') {
      const stegoConfig = scriptConfigs['steganography'];
      if (stegoConfig?.image_url && stegoConfig.image_url.startsWith('data:image/')) {
        setUploadedImagePreview(stegoConfig.image_url);
      } else {
        setUploadedImagePreview(null);
        setUploadedFileName('');
      }
    }
  }, [currentScript.id]);

  // Auto-init keys if needed (e.g. for RSA)
  useEffect(() => {
    if (!currentSchema || !currentScript.id) return;

    const hasGenKeysAction = currentSchema.actions?.some((a: any) => a.name === 'generate_keys');
    const hasPublicKeyParam = currentSchema.params?.some((p: any) => p.name === 'public_key' || p.name === 'my_public_key');

    if (hasGenKeysAction && hasPublicKeyParam) {
      const config = scriptConfigs[currentScript.id];
      if (!config || (!config.public_key && !config.my_public_key)) {
        console.log("Auto-generating keys for", currentScript.name);
        handleAction('generate_keys', true);
      }
    }
  }, [currentSchema, currentScript.id]);

  // ============ Encode / Decode ============

  const handleEncode = async () => {
    if (!inputText.trim()) return;

    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      type: 'user',
      content: inputText,
      timestamp: new Date(),
      isEncoded: false
    };

    const messagesWithUser = [...messages, userMessage];
    updateMessages(messagesWithUser);
    setInputText('');

    try {
      let result: string;
      if (currentScript.language === 'typescript') {
        result = await runTypeScriptScript(currentScript.code, 'encode', inputText);
      } else {
        result = await runPythonScript(currentScript.code, 'encode', inputText);
      }
      updateLastUsed(currentScript.id);
      const botMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        type: 'bot',
        content: result,
        timestamp: new Date(),
        encoding: `${currentScript.name} Encode`,
        isEncoded: false
      };
      updateMessages([...messagesWithUser, botMessage]);
    } catch (error: any) {
      const errorMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        type: 'bot',
        content: error.message,
        timestamp: new Date(),
        isError: true
      };
      updateMessages([...messagesWithUser, errorMessage]);
    }
  };

  const handleDecode = async () => {
    const trimmedInput = inputText.trim();
    // For the steganography script, allow decoding directly from the
    // uploaded / configured carrier image when the input box is empty:
    // users "send the encoded image back" by uploading it.
    const decodeInput = trimmedInput || (isStegoScript
      ? (uploadedImagePreview || scriptConfigs[currentScript.id]?.image_url || 'default_image.jpg')
      : '');
    if (!decodeInput) return;

    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      type: 'user',
      content: decodeInput,
      timestamp: new Date(),
      isEncoded: true
    };

    const messagesWithUser = [...messages, userMessage];
    updateMessages(messagesWithUser);
    setInputText('');

    try {
      let result: string;
      if (currentScript.language === 'typescript') {
        result = await runTypeScriptScript(currentScript.code, 'decode', decodeInput);
      } else {
        result = await runPythonScript(currentScript.code, 'decode', decodeInput);
      }
      updateLastUsed(currentScript.id);
      const botMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        type: 'bot',
        content: result,
        timestamp: new Date(),
        encoding: `${currentScript.name} Decode`,
        isEncoded: true
      };
      updateMessages([...messagesWithUser, botMessage]);
    } catch (error: any) {
      const errorMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        type: 'bot',
        content: error.message,
        timestamp: new Date(),
        isError: true
      };
      updateMessages([...messagesWithUser, errorMessage]);
    }
  };

  // ============ Settings / Actions ============

  const handleSaveSettings = (newConfig: any) => {
    const updatedConfigs = {
      ...scriptConfigs,
      [currentScript.id]: newConfig
    };
    setScriptConfigs(updatedConfigs);
    localStorage.setItem('scriptConfigs', JSON.stringify(updatedConfigs));
    setShowSettings(false);
  };

  const handleAction = async (actionName: string, silent: boolean = false) => {
    try {
      let newValues: any;

      if (currentScript.language === 'typescript') {
        newValues = await runTypeScriptAction(currentScript.code, actionName);
      } else {
        // Python
        if (!pyodide || !isPyodideReady) return;
        await pyodide.runPythonAsync(currentScript.code);
        const result = await pyodide.runPythonAsync(`${actionName}()`);
        newValues = result;
        if (typeof result === 'string') {
          try { newValues = JSON.parse(result); } catch { /* noop */ }
        } else if (result && typeof result.toJs === 'function') {
          newValues = result.toJs();
        }
      }

      if (newValues && typeof newValues === 'object') {
        const currentConfig = scriptConfigs[currentScript.id] || {};
        const updatedConfig = { ...currentConfig, ...newValues };
        const updatedConfigs = {
          ...scriptConfigs,
          [currentScript.id]: updatedConfig
        };
        setScriptConfigs(updatedConfigs);
        localStorage.setItem('scriptConfigs', JSON.stringify(updatedConfigs));

        const hasKey = Object.keys(newValues).some(k => k.includes('private_key') || k.includes('public_key'));
        if (hasKey) {
          const newHistoryItem: KeyPairHistory = {
            id: Date.now().toString(),
            timestamp: Date.now(),
            sourceName: currentScript.name,
            keys: newValues
          };
          const newHistory = [newHistoryItem, ...keyHistory];
          setKeyHistory(newHistory);
          localStorage.setItem('keyPairHistory', JSON.stringify(newHistory));
        }

        if (!silent) alert("Action completed successfully!");
      }
    } catch (e: any) {
      if (!silent) alert("Action failed: " + e.message);
      else console.error("Action failed:", e);
    }
  };

  const handleImportKey = (historyItem: KeyPairHistory) => {
    const currentConfig = scriptConfigs[currentScript.id] || {};
    const newConfig = { ...currentConfig };
    const sourceKeys = historyItem.keys;

    if (currentSchema?.params) {
      currentSchema.params.forEach((param: any) => {
        const name = param.name;
        if (name === 'public_key' || name === 'my_public_key') {
          if (sourceKeys['public_key']) newConfig[name] = sourceKeys['public_key'];
          else if (sourceKeys['my_public_key']) newConfig[name] = sourceKeys['my_public_key'];
        }
        if (name === 'private_key' || name === 'my_private_key') {
          if (sourceKeys['private_key']) newConfig[name] = sourceKeys['private_key'];
          else if (sourceKeys['my_private_key']) newConfig[name] = sourceKeys['my_private_key'];
        }
      });
    }

    setScriptConfigs({
      ...scriptConfigs,
      [currentScript.id]: newConfig
    });
    localStorage.setItem('scriptConfigs', JSON.stringify({
      ...scriptConfigs,
      [currentScript.id]: newConfig
    }));
    setShowKeyHistory(false);
  };

  // ============ Import / Export ============

  const handleExport = (friendId?: string) => {
    const dateStr = new Date().toISOString().slice(0, 10);
    let data;
    let filename;

    if (friendId) {
      const msgs = chatHistory[friendId];
      if (!msgs || msgs.length === 0) {
        alert(t.noData);
        return;
      }
      data = msgs;
      const friendName = (initialScripts[friendId] || userScripts[friendId])?.name || friendId;
      filename = `chat_${friendName.replace(/\s+/g, '_')}_${dateStr}.json`;
    } else {
      if (Object.keys(chatHistory).length === 0) {
        alert(t.noData);
        return;
      }
      data = chatHistory;
      filename = `all_chat_history_${dateStr}.json`;
    }

    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleImport = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const content = e.target?.result as string;
        const importedData = JSON.parse(content);
        let newData: { [friendId: string]: ChatMessage[] } = {};

        if (Array.isArray(importedData)) {
          if (selectedFriend) {
            newData[selectedFriend] = importedData;
          }
        } else {
          newData = importedData;
        }

        let importCount = 0;
        const updatedHistory = { ...chatHistory };

        Object.keys(newData).forEach(friendId => {
          if (initialScripts[friendId] || userScripts[friendId]) {
            const existingMsgs = updatedHistory[friendId] || [];
            const newMsgs = newData[friendId];

            if (Array.isArray(newMsgs)) {
              const combined = [...existingMsgs];
              const existingIds = new Set(existingMsgs.map(m => m.id));

              let addedForThisBot = 0;
              newMsgs.forEach((msg: any) => {
                if (msg.id && msg.content && msg.timestamp) {
                  if (!existingIds.has(msg.id)) {
                    combined.push({
                      ...msg,
                      timestamp: new Date(msg.timestamp)
                    });
                    existingIds.add(msg.id);
                    addedForThisBot++;
                  }
                }
              });

              if (addedForThisBot > 0) {
                combined.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
                updatedHistory[friendId] = combined;
                importCount += addedForThisBot;
              }
            }
          }
        });

        if (importCount > 0) {
          setChatHistory(updatedHistory);
          localStorage.setItem('chatHistory', JSON.stringify(updatedHistory));
          alert(t.importSuccess);
        } else {
          alert(t.importNoValidData);
        }

      } catch (error) {
        console.error('Import error:', error);
        alert(t.importFailed + (error as Error).message);
      }
      event.target.value = '';
    };
    reader.readAsText(file);
  };

  // ============ Image Upload (Client-side only, for steganography) ============

  const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      alert('请选择图片文件 / Please select an image file');
      event.target.value = '';
      return;
    }

    // Validate file size (max 20MB)
    if (file.size > 20 * 1024 * 1024) {
      alert('图片太大，请选择小于 20MB 的图片 / Image too large, max 20MB');
      event.target.value = '';
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const dataUrl = e.target?.result as string;
      setUploadedImagePreview(dataUrl);
      setUploadedFileName(file.name);

      // Store in script config so the steganography script can use it
      const updatedConfigs = {
        ...scriptConfigs,
        [currentScript.id]: {
          ...(scriptConfigs[currentScript.id] || {}),
          image_url: dataUrl
        }
      };
      setScriptConfigs(updatedConfigs);
      try {
        localStorage.setItem('scriptConfigs', JSON.stringify(updatedConfigs));
      } catch (e) {
        // Image data URL too large for localStorage: keep working with the
        // in-memory copy for this session instead of crashing.
        console.warn('Image too large to persist; it will need to be re-uploaded after reload:', e);
        alert('图片较大无法缓存到本地，本次会话可正常使用，刷新页面后需重新上传 / Image too large to cache; re-upload after reload');
      }
    };
    reader.readAsDataURL(file);
    event.target.value = '';
  };

  const handleClearImage = () => {
    setUploadedImagePreview(null);
    setUploadedFileName('');
    // Reset to default image (relative path so it works under the app base path)
    const updatedConfigs = {
      ...scriptConfigs,
      [currentScript.id]: {
        ...(scriptConfigs[currentScript.id] || {}),
        image_url: 'default_image.jpg'
      }
    };
    setScriptConfigs(updatedConfigs);
    try {
      localStorage.setItem('scriptConfigs', JSON.stringify(updatedConfigs));
    } catch (e) {
      console.warn('Failed to persist script configs:', e);
    }
  };

  const clearCurrentChat = () => {
    if (confirm(t.confirmClear.replace('{name}', currentScript?.name || ''))) {
      updateMessages([]);
    }
  };

  // ============ Script Management ============

  const DEFAULT_TS_TEMPLATE = `// Define encode and decode functions
// You can use async/await and Web APIs (e.g. Web Crypto API)
// Access settings via SCRIPT_CONFIG object

function encode(text) {
    // Implement your encoding logic here
    return text;
}

function decode(text) {
    // Implement your decoding logic here
    return text;
}
`;

  const DEFAULT_PY_TEMPLATE = `
def encode(text):
    # Implement your encoding logic here
    return text

def decode(text):
    # Implement your decoding logic here
    return text
`;

  const startEditScript = (key?: string) => {
    if (key && userScripts[key]) {
      setEditingKey(key);
      setEditingScript({ ...userScripts[key] });
    } else if (key && initialScripts[key]) {
      setEditingKey(null);
      setEditingScript({
        ...initialScripts[key],
        name: `${initialScripts[key].name} (Copy)`,
        id: ''
      });
    } else {
      setEditingKey(null);
      setEditingScript({
        id: '',
        name: t.defaultScriptName,
        description: t.defaultScriptDesc,
        avatar: '📜',
        code: DEFAULT_TS_TEMPLATE,
        language: 'typescript'
      });
    }
    setShowEditScript(true);
  };

  const saveScript = () => {
    if (!editingScript.name.trim()) return alert(t.nameRequired);

    const key = editingKey || `user_script_${Date.now()}`;
    // Auto-detect language if not explicitly set
    const language = editingScript.language || detectLanguage(editingScript.code);
    const newScript = {
      ...editingScript,
      id: key,
      language: language,
      isDefault: false
    };

    const newScripts = {
      ...userScripts,
      [key]: newScript
    };
    saveUserScripts(newScripts);
    setShowEditScript(false);

    if (!editingKey) setSelectedFriend(key);
  };

  const deleteScript = (key: string) => {
    if (confirm(t.confirmDelete)) {
      const newScripts = { ...userScripts };
      delete newScripts[key];
      saveUserScripts(newScripts);
      if (selectedFriend === key) setSelectedFriend(firstScriptKey || 'base64');
    }
  };

  const allFriends = [
    ...Object.values(initialScripts),
    ...Object.values(userScripts)
  ].sort((a, b) => {
    const timeA = lastUsedMap[a.id] || 0;
    const timeB = lastUsedMap[b.id] || 0;
    if (timeA !== timeB) {
      return timeB - timeA;
    }
    return 0;
  });

  // Status indicator
  const getStatusBadge = () => {
    if (needsPython) {
      if (isPyodideReady) {
        return { label: t.pythonReady, className: 'bg-green-100 text-green-700' };
      }
      if (isPyodideLoading) {
        return { label: t.loadingPython, className: 'bg-yellow-100 text-yellow-700' };
      }
      return { label: t.loadingPython, className: 'bg-yellow-100 text-yellow-700' };
    }
    return { label: t.tsReady, className: 'bg-green-100 text-green-700' };
  };

  const statusBadge = getStatusBadge();

  return (
    <div className="flex h-screen bg-gray-100 font-sans overflow-hidden">
      {/* Sidebar */}
      <div className={`bg-white border-r border-gray-200 flex-col w-full md:w-80 ${selectedFriend ? 'hidden md:flex' : 'flex'}`}>
        <div className="p-4 border-b border-gray-200 bg-gray-50">
          <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
            <span>🌈</span> {t.title}
          </h2>
          <p className="text-xs text-gray-500 mt-1">{t.subtitle}</p>
          <div className="mt-4">
            <button
              onClick={() => startEditScript()}
              className="w-full py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition flex items-center justify-center gap-2"
            >
              <span>+</span> {t.newScript}
            </button>
          </div>
        </div>
        <div className="flex-1 overflow-y-auto">
          {allFriends.map((friend) => (
            <div
              key={friend.id}
              onClick={() => handleSelectFriend(friend.id)}
              className={`p-3 border-b border-gray-100 cursor-pointer flex items-center gap-3 hover:bg-gray-50 transition ${selectedFriend === friend.id ? 'bg-blue-50 border-l-4 border-l-blue-500' : ''
                }`}
            >
              <div className="text-2xl">{friend.avatar}</div>
              <div className="flex-1 min-w-0">
                <div className="flex justify-between items-center">
                  <h3 className="font-medium text-gray-900 truncate">{friend.name}</h3>
                  {!friend.isDefault && (
                    <button
                      onClick={(e) => { e.stopPropagation(); deleteScript(friend.id); }}
                      className="text-gray-400 hover:text-red-500 px-1"
                    >
                      ×
                    </button>
                  )}
                </div>
                <p className="text-xs text-gray-500 truncate">{friend.description}</p>
              </div>
              <div className="flex flex-col gap-1">
                <button
                  onClick={(e) => { e.stopPropagation(); startEditScript(friend.id); }}
                  className="text-gray-400 hover:text-blue-500"
                  title={t.viewEditCode}
                >
                  <CodeBracketIcon className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>

        {/* Footer Actions: Language & Export All */}
        <div className="p-4 border-t border-gray-200 bg-gray-50 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <button
              onClick={() => handleExport()}
              className="p-2 text-gray-600 hover:bg-gray-200 rounded-full transition"
              title={t.exportAll}
            >
              <ArrowDownTrayIcon className="w-5 h-5" />
            </button>
            <label
              className="p-2 text-gray-600 hover:bg-gray-200 rounded-full transition cursor-pointer"
              title={t.importChat}
            >
              <ArrowUpTrayIcon className="w-5 h-5" />
              <input
                type="file"
                accept=".json"
                onChange={handleImport}
                className="hidden"
              />
            </label>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-500 select-none cursor-pointer" onClick={toggleLanguage}>
              {lang === 'en' ? 'English' : '中文'}
            </span>
            <button
              onClick={toggleLanguage}
              className="p-2 text-gray-600 hover:bg-gray-200 rounded-full transition"
              title="Switch Language / 切换语言"
            >
              <LanguageIcon className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>

      {/* Main Chat Area */}
      <div className={`flex-1 flex-col h-full relative ${!selectedFriend ? 'hidden md:flex' : 'flex'}`}>
        {/* Header */}
        <div className="h-16 border-b border-gray-200 bg-white flex items-center justify-between px-4 md:px-6">
          <div className="flex items-center gap-3 overflow-hidden">
            <button
              onClick={() => setSelectedFriend('')}
              className="md:hidden p-2 -ml-2 text-gray-600 hover:bg-gray-100 rounded-full"
            >
              <ArrowLeftIcon className="w-5 h-5" />
            </button>
            <div className="text-2xl flex-shrink-0">{currentScript?.avatar}</div>
            <div className="min-w-0">
              <h2 className="font-bold text-gray-800 truncate">{currentScript?.name}</h2>
              <p className="text-xs text-gray-500 truncate">{currentScript?.description}</p>
            </div>
          </div>
          <div className="flex gap-2 flex-shrink-0">
            {currentSchema && (
              <button
                onClick={() => setShowSettings(true)}
                className="text-gray-400 hover:text-blue-500 p-2"
                title="Script Settings"
              >
                <Cog6ToothIcon className="w-5 h-5" />
              </button>
            )}
            <div className={`px-3 py-1 rounded-full text-xs font-medium flex items-center gap-1 ${statusBadge.className}`}>
              {statusBadge.label}
            </div>
            <button
              onClick={() => handleExport(selectedFriend)}
              className="text-gray-400 hover:text-blue-500 p-2"
              title={t.exportChat}
            >
              <ArrowDownTrayIcon className="w-5 h-5" />
            </button>
            <button
              onClick={clearCurrentChat}
              className="text-gray-400 hover:text-red-500 p-2"
              title={t.clearChat}
            >
              <span className="text-lg">🗑️</span>
            </button>
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50">
          {messages.length === 0 && (
            <div className="text-center text-gray-400 mt-20">
              <div className="text-6xl mb-4">{needsPython ? '🐍' : '⚡'}</div>
              <p>{t.startEncoding}</p>
              <p className="text-sm mt-2">{t.enterText}</p>
            </div>
          )}
          {messages.map((msg) => (
            <div
              key={msg.id}
              className={`flex ${msg.type === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-[70%] rounded-lg p-3 shadow-sm ${msg.type === 'user'
                    ? msg.isEncoded ? 'bg-green-100 text-green-900' : 'bg-blue-100 text-blue-900'
                    : msg.isError
                      ? 'bg-red-50 border border-red-200 text-red-900'
                      : msg.isEncoded ? 'bg-white border border-green-200' : 'bg-white border border-blue-200'
                  }`}
              >
                <div className="text-sm break-all whitespace-pre-wrap font-mono">
                  {msg.type === 'user' && (
                    <span className="font-bold opacity-70 select-none mr-1">
                      {msg.isEncoded ? t.encoded : t.original}
                    </span>
                  )}
                  {isImageContent(msg.content) ? (
                    <div className="flex flex-col gap-2">
                      <img
                        src={msg.content}
                        alt="Encoded/Decoded image"
                        className="max-w-full h-auto rounded border border-gray-300 cursor-pointer"
                        style={{ maxHeight: '400px' }}
                        onClick={() => window.open(msg.content, '_blank')}
                      />
                      <span className="text-xs text-gray-400 block">
                        {msg.content.length > 80
                          ? msg.content.substring(0, 80) + '... (点击图片在新标签页中查看完整尺寸)'
                          : msg.content}
                      </span>
                    </div>
                  ) : (
                    msg.content
                  )}
                </div>
                <div className="flex justify-between items-center mt-1 gap-4">
                  <span className="text-xs text-gray-400">
                    {msg.type === 'bot' && msg.encoding ? msg.encoding : ''}
                  </span>
                  <div className="flex gap-1">
                    {isImageContent(msg.content) && (
                      <button
                        onClick={() => {
                          const a = document.createElement('a');
                          a.href = msg.content;
                          a.download = `stego_image_${Date.now()}.png`;
                          document.body.appendChild(a);
                          a.click();
                          document.body.removeChild(a);
                        }}
                        className="text-gray-400 hover:text-blue-600"
                        title="下载图片"
                      >
                        <ArrowDownTrayIcon className="w-3 h-3" />
                      </button>
                    )}
                    <button
                      onClick={() => navigator.clipboard.writeText(msg.content)}
                      className="text-gray-400 hover:text-gray-600"
                      title={t.copy}
                    >
                      <ClipboardDocumentIcon className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Input Area */}
        <div className="p-4 bg-white border-t border-gray-200">
          {/* Image upload bar (only visible for steganography script) */}
          {isStegoScript && (
            <div className="mb-3">
              <div className="flex items-center gap-2 flex-wrap">
                {/* Upload button */}
                <label className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg cursor-pointer transition text-xs font-medium">
                  <PhotoIcon className="w-4 h-4" />
                  {t.uploadImage}
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleImageUpload}
                    className="hidden"
                  />
                </label>

                {/* Uploaded image preview */}
                {uploadedImagePreview && (
                  <div className="flex items-center gap-2 bg-blue-50 border border-blue-200 rounded-lg px-2 py-1">
                    <div className="relative w-8 h-8 rounded overflow-hidden flex-shrink-0">
                      <img
                        src={uploadedImagePreview}
                        alt="Uploaded"
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <span className="text-xs text-blue-700 truncate max-w-[120px]">
                      {uploadedFileName || t.imageUploaded}
                    </span>
                    <button
                      onClick={handleClearImage}
                      className="text-blue-400 hover:text-red-500 transition"
                      title={t.clearImage}
                    >
                      <XMarkIcon className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}

                {/* Show default image label when no custom image */}
                {!uploadedImagePreview && (
                  <span className="text-xs text-gray-400">
                    📷 {t.imageSizeHint}
                  </span>
                )}
              </div>
            </div>
          )}

          <div className="flex gap-2">
            <textarea
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              placeholder={t.typePlaceholder}
              className="flex-1 border border-gray-300 rounded-lg p-3 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none h-24"
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleEncode();
                }
              }}
            />
            <div className="flex flex-col gap-2 justify-center">
              <button
                onClick={handleEncode}
                disabled={!isReady}
                className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium h-10"
              >
                {t.encode}
              </button>
              <button
                onClick={handleDecode}
                disabled={!isReady}
                className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium h-10"
              >
                {t.decode}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Settings Modal */}
      {showSettings && currentSchema && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg flex flex-col overflow-hidden max-h-[90vh]">
            <div className="p-4 border-b border-gray-200 flex justify-between items-center bg-gray-50">
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-lg">
                  {currentScript.name} Settings
                </h3>
                {currentSchema.params?.some((p: any) => p.name.includes('public_key') || p.name.includes('private_key')) && (
                  <button
                    onClick={() => setShowKeyHistory(true)}
                    className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded hover:bg-blue-200 transition"
                    title="Load from saved keys"
                  >
                    📂 Import Key Pair
                  </button>
                )}
              </div>
              <button onClick={() => setShowSettings(false)} className="text-gray-500 hover:text-gray-700 text-xl">×</button>
            </div>

            <div className="p-6 overflow-y-auto flex-1 space-y-4">
              {currentSchema.params?.map((param: any) => (
                <div key={param.name}>
                  <label className="block text-sm font-medium text-gray-700 mb-1">{param.label}</label>
                  {param.type === 'textarea' ? (
                    <textarea
                      value={scriptConfigs[currentScript.id]?.[param.name] || ''}
                      onChange={(e) => {
                        const newConfigs = { ...scriptConfigs };
                        if (!newConfigs[currentScript.id]) newConfigs[currentScript.id] = {};
                        newConfigs[currentScript.id][param.name] = e.target.value;
                        setScriptConfigs(newConfigs);
                      }}
                      placeholder={param.placeholder}
                      readOnly={param.readOnly}
                      className={`w-full border border-gray-300 rounded-md px-3 py-2 text-sm h-24 font-mono ${param.readOnly ? 'bg-gray-100 text-gray-500' : ''}`}
                    />
                  ) : (
                    <input
                      type={param.type === 'password' ? 'password' : 'text'}
                      value={scriptConfigs[currentScript.id]?.[param.name] || ''}
                      onChange={(e) => {
                        const newConfigs = { ...scriptConfigs };
                        if (!newConfigs[currentScript.id]) newConfigs[currentScript.id] = {};
                        newConfigs[currentScript.id][param.name] = e.target.value;
                        setScriptConfigs(newConfigs);
                      }}
                      placeholder={param.placeholder}
                      readOnly={param.readOnly}
                      className={`w-full border border-gray-300 rounded-md px-3 py-2 text-sm ${param.readOnly ? 'bg-gray-100 text-gray-500' : ''}`}
                    />
                  )}
                </div>
              ))}

              {currentSchema.actions?.length > 0 && (
                <div className="border-t pt-4 mt-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">Actions</label>
                  <div className="flex gap-2 flex-wrap">
                    {currentSchema.actions.map((action: any) => (
                      <button
                        key={action.name}
                        onClick={() => handleAction(action.name)}
                        className="px-3 py-2 bg-gray-200 hover:bg-gray-300 text-gray-800 rounded text-sm"
                      >
                        {action.label}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="p-4 border-t border-gray-200 bg-gray-50 flex justify-end gap-3">
              <button
                onClick={() => {
                  localStorage.setItem('scriptConfigs', JSON.stringify(scriptConfigs));
                  setShowSettings(false);
                }}
                className="px-4 py-2 bg-blue-600 text-white hover:bg-blue-700 rounded-md"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Key History Modal */}
      {showKeyHistory && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[60]">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md flex flex-col overflow-hidden max-h-[80vh]">
            <div className="p-4 border-b border-gray-200 flex justify-between items-center bg-gray-50">
              <h3 className="font-bold text-lg">Select Key Pair</h3>
              <button onClick={() => setShowKeyHistory(false)} className="text-gray-500 hover:text-gray-700 text-xl">×</button>
            </div>
            <div className="p-4 overflow-y-auto flex-1 space-y-2">
              {keyHistory.length === 0 ? (
                <p className="text-gray-500 text-center py-4">No saved keys found.<br />Generate keys in any script to save them here.</p>
              ) : (
                keyHistory.map(item => (
                  <div key={item.id} className="border border-gray-200 rounded p-3 hover:bg-gray-50 cursor-pointer" onClick={() => handleImportKey(item)}>
                    <div className="font-medium text-gray-800">{item.sourceName}</div>
                    <div className="text-xs text-gray-500">{new Date(item.timestamp).toLocaleString()}</div>
                    <div className="text-xs text-gray-400 mt-1 truncate font-mono">
                      {Object.keys(item.keys).join(', ')}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* Script Editor Modal */}
      {showEditScript && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-4xl h-[90vh] flex flex-col overflow-hidden">
            <div className="p-4 border-b border-gray-200 flex justify-between items-center bg-gray-50">
              <h3 className="font-bold text-lg">
                {editingKey ? t.editScript : t.createNewScript}
              </h3>
              <button onClick={() => setShowEditScript(false)} className="text-gray-500 hover:text-gray-700 text-xl">×</button>
            </div>

            <div className="p-6 overflow-y-auto flex-1 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">{t.name}</label>
                  <input
                    type="text"
                    value={editingScript.name}
                    onChange={e => setEditingScript({ ...editingScript, name: e.target.value })}
                    className="w-full border border-gray-300 rounded-md px-3 py-2"
                    placeholder={t.myScriptPlaceholder}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">{t.avatar}</label>
                  <input
                    type="text"
                    value={editingScript.avatar}
                    onChange={e => setEditingScript({ ...editingScript, avatar: e.target.value })}
                    className="w-full border border-gray-300 rounded-md px-3 py-2"
                    placeholder="⚡"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">{t.description}</label>
                  <input
                    type="text"
                    value={editingScript.description}
                    onChange={e => setEditingScript({ ...editingScript, description: e.target.value })}
                    className="w-full border border-gray-300 rounded-md px-3 py-2"
                    placeholder={t.descPlaceholder}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">{t.scriptLanguage}</label>
                  <select
                    value={editingScript.language || 'typescript'}
                    onChange={e => {
                      const newLang = e.target.value as 'typescript' | 'python';
                      const newCode = editingScript.code === DEFAULT_TS_TEMPLATE || editingScript.code === DEFAULT_PY_TEMPLATE || !editingScript.code
                        ? (newLang === 'typescript' ? DEFAULT_TS_TEMPLATE : DEFAULT_PY_TEMPLATE)
                        : editingScript.code;
                      setEditingScript({ ...editingScript, language: newLang, code: newCode });
                    }}
                    className="w-full border border-gray-300 rounded-md px-3 py-2 bg-white"
                  >
                    <option value="typescript">TypeScript / JavaScript</option>
                    <option value="python">Python (requires Pyodide)</option>
                  </select>
                </div>
              </div>

              <div className="flex-1 flex flex-col min-h-[400px]">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {(editingScript.language || 'typescript') === 'typescript' ? t.typescriptCode : t.pythonCode}
                </label>
                <div className="bg-gray-800 text-gray-100 rounded-md flex-1 flex flex-col overflow-hidden">
                  <div
                    className="bg-gray-900 px-4 py-2 text-xs text-gray-400 border-b border-gray-700"
                    dangerouslySetInnerHTML={{
                      __html: (editingScript.language || 'typescript') === 'typescript' ? t.codeHintTS : t.codeHintPy
                    }}
                  />
                  <textarea
                    value={editingScript.code}
                    onChange={e => setEditingScript({ ...editingScript, code: e.target.value })}
                    className="flex-1 w-full bg-transparent p-4 font-mono text-sm focus:outline-none resize-none"
                    spellCheck={false}
                  />
                </div>
              </div>
            </div>

            <div className="p-4 border-t border-gray-200 bg-gray-50 flex justify-end gap-3">
              <button
                onClick={() => setShowEditScript(false)}
                className="px-4 py-2 text-gray-600 hover:bg-gray-200 rounded-md"
              >
                {t.cancel}
              </button>
              <button
                onClick={saveScript}
                className="px-4 py-2 bg-blue-600 text-white hover:bg-blue-700 rounded-md"
              >
                {t.saveScript}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Error Toast */}
      {pyodideError && (
        <div className="fixed bottom-4 right-4 bg-red-500 text-white px-4 py-2 rounded-lg shadow-lg z-50">
          {pyodideError}
        </div>
      )}
    </div>
  );
}
