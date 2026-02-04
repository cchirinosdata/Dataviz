
import React, { useState, useRef, useEffect } from 'react';
import { Send, User, Bot, Loader2, Sparkles } from 'lucide-react';
import { GoogleGenAI } from '@google/genai';
import { DataState, Message } from '../types';

interface Props {
  data: DataState;
  externalPrompt?: string;
  onPromptProcessed?: () => void;
}

const Chat: React.FC<Props> = ({ data, externalPrompt, onPromptProcessed }) => {
  const [messages, setMessages] = useState<Message[]>([
    { role: 'assistant', content: '¡Hola! Soy tu analista senior. He procesado tus datos y estoy listo para ayudarte a encontrar insights accionables. ¿Por dónde quieres empezar?' }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, loading]);

  useEffect(() => {
    if (externalPrompt) {
      handleSendMessage(externalPrompt);
      onPromptProcessed?.();
    }
  }, [externalPrompt]);

  const handleSendMessage = async (text: string) => {
    if (!text.trim() || loading) return;

    const userMessage: Message = { role: 'user', content: text };
    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setLoading(true);

    try {
      // Use process.env.API_KEY directly for initialization
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      
      // We send a summary context to the AI
      const systemPrompt = `Eres un analista de datos senior con criterio de negocio.
Tus respuestas deben ser en español, profesionales, directas y basadas UNICAMENTE en los datos proporcionados.

DATOS PROCESADOS:
- Total registros limpios: ${data.cleanedData.length}
- Columnas identificadas: ${data.columns.map(c => `${c.name} (${c.type})`).join(', ')}
- Usuarios al 100%: ${data.insights.completions.length}
- Usuarios < 25%: ${data.insights.lowProgressCount}
- Resumen Distribución: ${JSON.stringify(data.insights.progressDistribution)}
- Metricas extra: ${JSON.stringify(data.insights.metrics)}

REGLAS:
1. Si el usuario pide nombres o tablas, genera una respuesta clara y formateada.
2. Si una columna es IDENTIFICADOR (como DNI), JAMÁS calcules promedios sobre ella.
3. Prioriza lo accionable. No solo digas el número, di qué significa.
4. Si la pregunta no se puede responder con los datos, dilo honestamente.

CONTEXTO DE DATOS (Muestra aleatoria representativa):
${JSON.stringify(data.cleanedData.slice(0, 20))}
`;

      const response = await ai.models.generateContent({
        model: 'gemini-3-pro-preview',
        contents: text,
        config: {
          systemInstruction: systemPrompt,
          temperature: 0.2, // Low temperature for factual consistency
        },
      });

      // Use the .text property directly from the response object
      const assistantMessage: Message = { role: 'assistant', content: response.text || 'Lo siento, tuve un problema procesando tu pregunta.' };
      setMessages(prev => [...prev, assistantMessage]);
    } catch (error) {
      console.error(error);
      setMessages(prev => [...prev, { role: 'assistant', content: 'Error conectando con el servicio de IA. Por favor, verifica tu conexión.' }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white rounded-xl shadow-lg border border-slate-200 h-[600px] flex flex-col overflow-hidden">
      <div className="p-4 border-b border-slate-100 bg-slate-50 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="bg-blue-600 p-1.5 rounded-lg text-white">
            <Sparkles size={18} />
          </div>
          <span className="font-semibold text-slate-800">Chat de Análisis Directo</span>
        </div>
        <div className="flex items-center gap-1.5 text-xs text-slate-400">
          <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
          Conectado a Gemini 3
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-6">
        {messages.map((m, i) => (
          <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`flex gap-3 max-w-[85%] ${m.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}>
              <div className={`shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${m.role === 'user' ? 'bg-slate-200 text-slate-600' : 'bg-blue-100 text-blue-600'}`}>
                {m.role === 'user' ? <User size={16} /> : <Bot size={16} />}
              </div>
              <div className={`p-4 rounded-2xl text-sm leading-relaxed whitespace-pre-wrap ${
                m.role === 'user' 
                  ? 'bg-blue-600 text-white shadow-md rounded-tr-none' 
                  : 'bg-slate-100 text-slate-700 rounded-tl-none border border-slate-200'
              }`}>
                {m.content}
              </div>
            </div>
          </div>
        ))}
        {loading && (
          <div className="flex justify-start">
            <div className="flex gap-3 max-w-[85%]">
              <div className="shrink-0 w-8 h-8 rounded-full flex items-center justify-center bg-blue-100 text-blue-600">
                <Loader2 size={16} className="animate-spin" />
              </div>
              <div className="p-4 rounded-2xl bg-slate-100 text-slate-400 text-sm animate-pulse rounded-tl-none">
                Analizando los datos para responderte...
              </div>
            </div>
          </div>
        )}
        <div ref={chatEndRef} />
      </div>

      <div className="p-4 border-t border-slate-100 bg-slate-50">
        <div className="relative">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSendMessage(input)}
            placeholder="Haz una pregunta sobre tus datos..."
            className="w-full pl-4 pr-12 py-3 bg-white border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all shadow-sm"
          />
          <button
            onClick={() => handleSendMessage(input)}
            disabled={loading || !input.trim()}
            className="absolute right-2 top-2 p-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:bg-slate-400 transition-colors"
          >
            <Send size={18} />
          </button>
        </div>
      </div>
    </div>
  );
};

export default Chat;
