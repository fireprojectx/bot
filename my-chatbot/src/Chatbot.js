import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import mermaid from 'mermaid';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import './Chatbot.css';

const Chatbot = () => {
    const [messages, setMessages] = useState([]);
    const [input, setInput] = useState('');
    const [error, setError] = useState(null);
    const mermaidDivRef = useRef(null);

    useEffect(() => {
        mermaid.initialize({ startOnLoad: true });
    }, []);

    useEffect(() => {
        if (mermaidDivRef.current) {
            mermaid.contentLoaded();
        }
    }, [messages]);

    const handleInputChange = (e) => {
        setInput(e.target.value);
    };

    const handleSendMessage = async () => {
        if (input.trim() === '') return;

        const userMessage = { sender: 'user', text: input };
        setMessages((prevMessages) => [...prevMessages, userMessage]);

        const fixedText = `Crie um diagrama no formato Mermaid sobre o tema "${input}".`;

        try {
            const response = await axios.post(
                'https://generativelanguage.googleapis.com/v1/models/gemini-pro:generateContent',
                {
                    contents: [
                        {
                            role: 'user',
                            parts: [{ text: fixedText }]
                        }
                    ]
                },
                {
                    headers: {
                        'Content-Type': 'application/json',
                        'x-goog-api-key': process.env.REACT_APP_GEMINI_API_KEY,
                    },
                }
            );

            const botMessage = {
                sender: 'assistant',
                text: response.data.candidates[0].content.parts[0].text,
            };
            setMessages((prevMessages) => [...prevMessages, botMessage]);
        } catch (error) {
            console.error('Error sending message:', error);
            const errorMessage = { sender: 'assistant', text: 'Error: Could not fetch response from Gemini API.' };
            setMessages((prevMessages) => [...prevMessages, errorMessage]);
        }

        setInput('');
    };

    const renderMermaidDiagram = (message, index) => {
        const mermaidRegex = /```mermaid\n([\s\S]+?)```/;
        const match = message.match(mermaidRegex);
        if (match) {
            const diagram = match[1];
            const diagramId = `mermaid-diagram-${index}`;

            try {
                mermaid.parse(diagram);

                setTimeout(() => {
                    mermaid.contentLoaded();
                    mermaid.init(undefined, `#${diagramId}`);
                }, 0);

                return (
                    <div>
                        <div id={diagramId} className="mermaid">{diagram}</div>
                        <button onClick={() => downloadPDF(diagramId)}>Baixar PDF</button>
                    </div>
                );
            } catch (e) {
                console.error('Invalid Mermaid syntax:', e);
                return (
                    <div>
                        <div>Invalid Mermaid syntax, displaying as plain text:</div>
                        <div>{message}</div>
                    </div>
                );
            }
        }
        return <div>{message}</div>;
    };

    const downloadPDF = async (diagramId) => {
        const input = document.getElementById(diagramId);
        const canvas = await html2canvas(input, { scale: 2 });
        const imgData = canvas.toDataURL('image/png');
        const pdf = new jsPDF({
            orientation: 'landscape',
            unit: 'px',
            format: [canvas.width, canvas.height],
        });

        pdf.setFontSize(10);
        pdf.addImage(imgData, 'PNG', 0, 0, canvas.width, canvas.height);
        pdf.save('diagram.pdf');
    };

    return (
        <div>
            <div className="chatbox">
                {messages.map((msg, index) => (
                    <div key={index} className={`message ${msg.sender}`}>
                        {msg.sender === 'assistant' ? renderMermaidDiagram(msg.text, index) : msg.text}
                    </div>
                ))}
                {error && <div className="error-message">{error}</div>}
            </div>
            <div className="input-container">
                <input
                    type="text"
                    value={input}
                    onChange={handleInputChange}
                />
                <button onClick={handleSendMessage}>Send</button>
            </div>
        </div>
    );
};

export default Chatbot;
