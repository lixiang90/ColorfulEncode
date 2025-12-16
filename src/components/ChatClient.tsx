'use client';

import { useState, useEffect } from 'react';
import { CodeBracketIcon, ClipboardDocumentIcon, LanguageIcon, ArrowDownTrayIcon, ArrowUpTrayIcon, ArrowLeftIcon, Cog6ToothIcon } from '@heroicons/react/24/outline';
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
    subtitle: 'Python-Powered Encoder',
    newScript: 'New Script',
    pythonReady: 'Python Ready',
    loadingPython: 'Loading Python...',
    startEncoding: 'Start encoding with Python!',
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
    pythonCode: 'Python Code',
    codeHint: 'Must define <code>encode(text)</code> and <code>decode(text)</code> functions.',
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
    defaultScriptDesc: 'Custom Python encoding script',
    exportChat: 'Export Chat',
    exportAll: 'Export All',
    importChat: 'Import Chat',
    noData: 'No data to export',
    importSuccess: 'Import successful!',
    importFailed: 'Import failed: ',
    importNoValidData: 'No valid chat records found for existing bots.'
  },
  zh: {
    title: 'Colorful Encode',
    subtitle: 'Python 驱动的编码器',
    newScript: '新建脚本',
    pythonReady: 'Python 就绪',
    loadingPython: '正在加载 Python...',
    startEncoding: '开始使用 Python 编码！',
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
    pythonCode: 'Python 代码',
    codeHint: '必须定义 <code>encode(text)</code> 和 <code>decode(text)</code> 函数。',
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
    defaultScriptDesc: '自定义 Python 编码脚本',
    exportChat: '导出当前对话',
    exportAll: '导出全部记录',
    importChat: '导入记录',
    noData: '暂无数据可导出',
    importSuccess: '导入成功！',
    importFailed: '导入失败：',
    importNoValidData: '未找到现有 Bot 的有效聊天记录。'
  }
};

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
  const [chatHistory, setChatHistory] = useState<{[friendId: string]: ChatMessage[]}>({});
  const [userScripts, setUserScripts] = useState<{[key: string]: ScriptPreset}>({});
  const [lastUsedMap, setLastUsedMap] = useState<Record<string, number>>({});
  
  // Script Configuration State
  const [scriptConfigs, setScriptConfigs] = useState<Record<string, Record<string, any>>>({});
  const [showSettings, setShowSettings] = useState(false);
  const [currentSchema, setCurrentSchema] = useState<any>(null);

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
    code: ''
  });

  // Pyodide State
  const [pyodide, setPyodide] = useState<any>(null);
  const [isPyodideReady, setIsPyodideReady] = useState(false);
  const [pyodideError, setPyodideError] = useState<string | null>(null);

  // Load Pyodide
  useEffect(() => {
    async function initPyodide() {
      try {
        if (window.loadPyodide && !pyodide) {
          const py = await window.loadPyodide();
          await py.loadPackage("pycryptodome");
          setPyodide(py);

          setIsPyodideReady(true);
          console.log("Pyodide loaded successfully");
        }
      } catch (e: any) {
        console.error("Failed to load Pyodide", e);
        setPyodideError("Failed to load Python: " + (e.message || String(e)));
      }
    }

    if (!window.loadPyodide) {
      let attempts = 0;
      const interval = setInterval(() => {
        attempts++;
        if (window.loadPyodide) {
          clearInterval(interval);
          initPyodide();
        } else if (attempts > 20) { // Timeout after 10s
           clearInterval(interval);
           setPyodideError("Pyodide script load timeout");
        }
      }, 500);
      return () => clearInterval(interval);
    } else {
      initPyodide();
    }
  }, [pyodide]);

  // Load User Scripts and History
  useEffect(() => {
    const savedScripts = localStorage.getItem('userScripts');
    if (savedScripts) {
      try {
        setUserScripts(JSON.parse(savedScripts));
      } catch (e) {
        console.error('Failed to load user scripts:', e);
      }
    }

    const savedChatHistory = localStorage.getItem('chatHistory');
    if (savedChatHistory) {
      try {
        const parsedHistory = JSON.parse(savedChatHistory);
        const restoredHistory: {[friendId: string]: ChatMessage[]} = {};
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
        setScriptConfigs(JSON.parse(savedConfigs));
      } catch (e) {
        console.error('Failed to load script configs:', e);
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

  const updateMessages = (newMessages: ChatMessage[]) => {
    const newChatHistory = {
      ...chatHistory,
      [selectedFriend]: newMessages
    };
    setChatHistory(newChatHistory);
    localStorage.setItem('chatHistory', JSON.stringify(newChatHistory));
  };

  const messages = chatHistory[selectedFriend] || [];
  
  const currentScript = initialScripts[selectedFriend] || userScripts[selectedFriend] || {
    id: 'unknown',
    name: 'Unknown Script',
    description: 'Script not found',
    avatar: '❓',
    code: ''
  };

  // Helper to load schema
  const loadSchema = async () => {
    if (!pyodide || !isPyodideReady || !currentScript.code) {
        setCurrentSchema(null);
        return;
    }
    
    try {
        // We just need to define the function in Python environment first
        // But running the whole code might be side-effect heavy if not designed well?
        // Usually safe for these scripts.
        await pyodide.runPythonAsync(currentScript.code);
        
        // Check if get_config_schema exists
        const hasSchema = pyodide.runPython(" 'get_config_schema' in globals() ");
        if (hasSchema) {
            const schemaJson = await pyodide.runPythonAsync("get_config_schema()");
            // schemaJson is expected to be a JSON string or object
            // If it returns a python dict, pyodide converts it to a Js Map or Proxy.
            // Safer to return JSON string from Python.
            
            let schema = schemaJson;
            if (typeof schema === 'string') {
                schema = JSON.parse(schema);
            } else if (schema && typeof schema.toJs === 'function') {
                 schema = schema.toJs();
            }
            setCurrentSchema(schema);
        } else {
            setCurrentSchema(null);
        }
    } catch (e) {
        console.error("Failed to load schema:", e);
        setCurrentSchema(null);
    }
  };

  useEffect(() => {
    loadSchema();
  }, [currentScript.id, isPyodideReady]);

  // Auto-init keys if needed (e.g. for RSA)
  useEffect(() => {
    if (!currentSchema || !currentScript.id) return;

    // Check if we should auto-generate keys
    // Condition: Schema has 'generate_keys' action AND 'public_key' param
    const hasGenKeysAction = currentSchema.actions?.some((a: any) => a.name === 'generate_keys');
    const hasPublicKeyParam = currentSchema.params?.some((p: any) => p.name === 'public_key');
    
    if (hasGenKeysAction && hasPublicKeyParam) {
        const config = scriptConfigs[currentScript.id];
        // If config is missing or public_key is not set
        if (!config || !config.public_key) {
            console.log("Auto-generating keys for", currentScript.name);
            handleAction('generate_keys', true);
        }
    }
  }, [currentSchema, currentScript.id]);

  // Helper to run python code
  const runPythonScript = async (code: string, functionName: 'encode' | 'decode', input: string): Promise<string> => {
    if (!pyodide || !isPyodideReady) {
      throw new Error("Python environment not ready");
    }

    try {
      // Load the code
      await pyodide.runPythonAsync(code);
      
      // Inject Config
      const config = scriptConfigs[currentScript.id] || {};
      // Pass config as a Python dictionary
      // Pyodide can convert JS objects to Python dicts via globals.set? 
      // Actually simpler to pass as JSON string and parse in Python or use pyodide.toPy?
      // Let's set a global SCRIPT_CONFIG variable
      // We need to make sure values are strings or simple types
      
      // Method: JSON serialization is safest to avoid type mismatches
      const configJson = JSON.stringify(config);
      pyodide.globals.set("SCRIPT_CONFIG_JSON", configJson);
      await pyodide.runPythonAsync(`
import json
try:
    SCRIPT_CONFIG = json.loads(SCRIPT_CONFIG_JSON)
except:
    SCRIPT_CONFIG = {}
`);
      
      // Call the function
      // We pass the input as a string variable to avoid syntax issues in f-string or injection
      pyodide.globals.set("input_text", input);
      const result = await pyodide.runPythonAsync(`${functionName}(input_text)`);
      return String(result);
    } catch (e: any) {
      console.error("Python execution error:", e);
      
      let friendlyMsg = e.message || String(e);
      
      // Extract Python exception message
      // Matches "ValueError: message" or "Exception: message" etc.
      const errorMatch = friendlyMsg.match(/\w*(?:Error|Exception):\s*(.*)/);
      if (errorMatch && errorMatch[1]) {
        friendlyMsg = errorMatch[1].trim();
      } else {
        // Fallback: try to get the last line which usually contains the error
        const lines = friendlyMsg.trim().split('\n');
        if (lines.length > 0) {
            friendlyMsg = lines[lines.length - 1];
        }
      }
      
      throw new Error(friendlyMsg);
    }
  };

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
      const result = await runPythonScript(currentScript.code, 'encode', inputText);
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
        content: error.message, // Directly use the friendly message
        timestamp: new Date(),
        isError: true
      };
      updateMessages([...messagesWithUser, errorMessage]);
    }
  };

  const handleDecode = async () => {
    if (!inputText.trim()) return;

    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      type: 'user',
      content: inputText,
      timestamp: new Date(),
      isEncoded: true
    };

    const messagesWithUser = [...messages, userMessage];
    updateMessages(messagesWithUser);
    setInputText('');

    try {
      const result = await runPythonScript(currentScript.code, 'decode', inputText);
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
        content: error.message, // Directly use the friendly message
        timestamp: new Date(),
        isError: true
      };
      updateMessages([...messagesWithUser, errorMessage]);
    }
  };

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
     if (!pyodide || !isPyodideReady) return;
     try {
         await pyodide.runPythonAsync(currentScript.code);
         const result = await pyodide.runPythonAsync(`${actionName}()`);
         // Expecting result to be JSON string or dict with new config values
         let newValues = result;
         if (typeof result === 'string') {
             try {
                newValues = JSON.parse(result);
             } catch {}
         } else if (result && typeof result.toJs === 'function') {
             newValues = result.toJs();
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
             if (!silent) alert("Action completed successfully!");
         }
     } catch (e: any) {
         if (!silent) alert("Action failed: " + e.message);
         else console.error("Action failed:", e);
     }
  };

  const handleExport = (friendId?: string) => {
    const dateStr = new Date().toISOString().slice(0, 10);
    let data;
    let filename;

    if (friendId) {
        const messages = chatHistory[friendId];
        if (!messages || messages.length === 0) {
            alert(t.noData);
            return;
        }
        data = messages;
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
            let newData: {[friendId: string]: ChatMessage[]} = {};
            
            // Normalize input data structure
            if (Array.isArray(importedData)) {
                // If it's a single array (exported from single chat), try to assign to current bot or detect from content?
                // Actually, the requirements say "only import for existing bots".
                // If single array, we don't know which bot it belongs to unless the user selected it or we guess.
                // But the export format for single chat is just an array of messages. 
                // It's safer to assume the user wants to import into the CURRENTLY selected bot if it's an array.
                if (selectedFriend) {
                    newData[selectedFriend] = importedData;
                }
            } else {
                // Assume object format { friendId: [messages] }
                newData = importedData;
            }

            let importCount = 0;
            const updatedHistory = { ...chatHistory };

            Object.keys(newData).forEach(friendId => {
                // Check if bot exists
                if (initialScripts[friendId] || userScripts[friendId]) {
                    const existingMsgs = updatedHistory[friendId] || [];
                    const newMsgs = newData[friendId];

                    if (Array.isArray(newMsgs)) {
                        // Merge and deduplicate based on ID
                        const combined = [...existingMsgs];
                        const existingIds = new Set(existingMsgs.map(m => m.id));
                        
                        let addedForThisBot = 0;
                        newMsgs.forEach((msg: any) => {
                             // Basic validation of message structure
                             if (msg.id && msg.content && msg.timestamp) {
                                 if (!existingIds.has(msg.id)) {
                                     combined.push({
                                         ...msg,
                                         timestamp: new Date(msg.timestamp) // Ensure date object
                                     });
                                     existingIds.add(msg.id);
                                     addedForThisBot++;
                                 }
                             }
                        });

                        if (addedForThisBot > 0) {
                            // Sort by timestamp
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
        // Reset input
        event.target.value = '';
    };
    reader.readAsText(file);
  };

  const clearCurrentChat = () => {
    if (confirm(t.confirmClear.replace('{name}', currentScript?.name || ''))) {
      updateMessages([]);
    }
  };

  // Script Management
  const startEditScript = (key?: string) => {
    if (key && userScripts[key]) {
      setEditingKey(key);
      setEditingScript({ ...userScripts[key] });
    } else if (key && initialScripts[key]) {
        // Clone default script to new user script
        setEditingKey(null);
        setEditingScript({
            ...initialScripts[key],
            name: `${initialScripts[key].name} (Copy)`,
            id: '' // Will be generated on save
        });
    } else {
      setEditingKey(null);
      setEditingScript({
        id: '',
        name: t.defaultScriptName,
        description: t.defaultScriptDesc,
        avatar: '📜',
        code: `
def encode(text):
    # Implement your encoding logic here
    return text

def decode(text):
    # Implement your decoding logic here
    return text
`
      });
    }
    setShowEditScript(true);
  };

  const saveScript = () => {
    if (!editingScript.name.trim()) return alert(t.nameRequired);
    
    const key = editingKey || `user_script_${Date.now()}`;
    const newScript = {
        ...editingScript,
        id: key,
        isDefault: false
    };

    const newScripts = {
      ...userScripts,
      [key]: newScript
    };
    saveUserScripts(newScripts);
    setShowEditScript(false);
    
    // Select the new script if it was a new creation
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
        return timeB - timeA; // Descending order of usage
    }
    // Fallback to name or something stable if no usage
    // To keep default scripts in a somewhat consistent order if never used
    return 0; 
  });

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
              className={`p-3 border-b border-gray-100 cursor-pointer flex items-center gap-3 hover:bg-gray-50 transition ${
                selectedFriend === friend.id ? 'bg-blue-50 border-l-4 border-l-blue-500' : ''
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
            <div className={`px-3 py-1 rounded-full text-xs font-medium flex items-center gap-1 ${
                isPyodideReady ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'
            }`}>
                {isPyodideReady ? t.pythonReady : t.loadingPython}
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
              <div className="text-6xl mb-4">🐍</div>
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
                className={`max-w-[70%] rounded-lg p-3 shadow-sm ${
                  msg.type === 'user'
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
                  {msg.content}
                </div>
                <div className="flex justify-between items-center mt-1 gap-4">
                    <span className="text-xs text-gray-400">
                    {msg.type === 'bot' && msg.encoding ? msg.encoding : ''}
                    </span>
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
          ))}
        </div>

        {/* Input Area */}
        <div className="p-4 bg-white border-t border-gray-200">
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
                disabled={!isPyodideReady}
                className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium h-10"
              >
                {t.encode}
              </button>
              <button
                onClick={handleDecode}
                disabled={!isPyodideReady}
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
                <h3 className="font-bold text-lg">
                    {currentScript.name} Settings
                </h3>
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
                                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm h-24 font-mono"
                            />
                        ) : (
                             <input 
                                type="text"
                                value={scriptConfigs[currentScript.id]?.[param.name] || ''}
                                onChange={(e) => {
                                    const newConfigs = { ...scriptConfigs };
                                    if (!newConfigs[currentScript.id]) newConfigs[currentScript.id] = {};
                                    newConfigs[currentScript.id][param.name] = e.target.value;
                                    setScriptConfigs(newConfigs);
                                }}
                                placeholder={param.placeholder}
                                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
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
                            onChange={e => setEditingScript({...editingScript, name: e.target.value})}
                            className="w-full border border-gray-300 rounded-md px-3 py-2"
                            placeholder={t.myScriptPlaceholder}
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">{t.avatar}</label>
                        <input 
                            type="text" 
                            value={editingScript.avatar}
                            onChange={e => setEditingScript({...editingScript, avatar: e.target.value})}
                            className="w-full border border-gray-300 rounded-md px-3 py-2"
                            placeholder="🐍"
                        />
                    </div>
                </div>
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">{t.description}</label>
                    <input 
                        type="text" 
                        value={editingScript.description}
                        onChange={e => setEditingScript({...editingScript, description: e.target.value})}
                        className="w-full border border-gray-300 rounded-md px-3 py-2"
                        placeholder={t.descPlaceholder}
                    />
                </div>

                <div className="flex-1 flex flex-col min-h-[400px]">
                    <label className="block text-sm font-medium text-gray-700 mb-1">{t.pythonCode}</label>
                    <div className="bg-gray-800 text-gray-100 rounded-md flex-1 flex flex-col overflow-hidden">
                        <div className="bg-gray-900 px-4 py-2 text-xs text-gray-400 border-b border-gray-700" dangerouslySetInnerHTML={{__html: t.codeHint}} />
                        <textarea 
                            value={editingScript.code}
                            onChange={e => setEditingScript({...editingScript, code: e.target.value})}
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
      
      {/* Loading Status Toast */}
      {/* {!isPyodideReady && loadingStatus && !pyodideError && (
        <div className="fixed bottom-4 right-4 bg-blue-500 text-white px-4 py-2 rounded-lg shadow-lg z-50 animate-pulse">
          {loadingStatus}
        </div>
      )} */}
    </div>
  );
}
