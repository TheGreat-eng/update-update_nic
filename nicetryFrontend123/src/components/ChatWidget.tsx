import React, { useState, useRef, useEffect } from 'react';
import { Button, Input, Card, Avatar, Spin, FloatButton } from 'antd';
import { SendOutlined, RobotOutlined, CloseOutlined } from '@ant-design/icons';
import { motion, AnimatePresence } from 'framer-motion';
import { useFarm } from '../context/FarmContext';
import { sendChatMessage } from '../api/chatService';

interface Message {
    id: number;
    text: string;
    sender: 'user' | 'ai';
}

const ChatWidget: React.FC = () => {
    const { farmId } = useFarm();
    const [isOpen, setIsOpen] = useState(false);
    const [input, setInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [messages, setMessages] = useState<Message[]>([
        { id: 1, text: 'Xin chào! Tôi là trợ lý ảo SmartFarm. Tôi có thể giúp gì cho bác hôm nay?', sender: 'ai' }
    ]);

    const messagesEndRef = useRef<HTMLDivElement>(null);

    // Tự động cuộn xuống cuối khi có tin nhắn mới
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages, isOpen]);

    const handleSend = async () => {
        if (!input.trim() || !farmId) return;

        const userMsg = input;
        setInput('');

        // Thêm tin nhắn user
        const newUserMsg: Message = { id: Date.now(), text: userMsg, sender: 'user' };
        setMessages(prev => [...prev, newUserMsg]);
        setIsLoading(true);

        try {
            const response = await sendChatMessage(farmId, userMsg);

            // Thêm tin nhắn AI
            const aiMsg: Message = {
                id: Date.now() + 1,
                text: response.data || 'Xin lỗi, tôi không nhận được phản hồi.',
                sender: 'ai'
            };
            setMessages(prev => [...prev, aiMsg]);
        } catch (error) {
            const errorMsg: Message = {
                id: Date.now() + 1,
                text: 'Có lỗi kết nối đến server. Vui lòng thử lại sau.',
                sender: 'ai'
            };
            setMessages(prev => [...prev, errorMsg]);
        } finally {
            setIsLoading(false);
        }
    };

    // Nếu chưa chọn Farm thì không hiện Chatbot (hoặc hiện nhưng disable)
    if (!farmId) return null;

    return (
        <>
            {/* Nút nổi để mở chat */}
            <FloatButton
                icon={<RobotOutlined />}
                type="primary"
                style={{ right: 24, bottom: 24, width: 56, height: 56 }}
                onClick={() => setIsOpen(!isOpen)}
                badge={{ dot: true, color: 'green' }}
                tooltip="Trợ lý ảo AI"
            />

            {/* Cửa sổ chat */}
            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        initial={{ opacity: 0, y: 20, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 20, scale: 0.95 }}
                        transition={{ duration: 0.2 }}
                        style={{
                            position: 'fixed',
                            bottom: 90,
                            right: 24,
                            zIndex: 1000,
                            width: 380,
                            maxWidth: '90vw',
                            boxShadow: '0 8px 32px rgba(0,0,0,0.15)',
                            borderRadius: 16,
                            overflow: 'hidden'
                        }}
                    >
                        <Card
                            bodyStyle={{ padding: 0, display: 'flex', flexDirection: 'column', height: 500 }}
                            bordered={false}
                        >
                            {/* Header */}
                            <div style={{
                                padding: '16px',
                                background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
                                color: 'white',
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'center'
                            }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                    <Avatar icon={<RobotOutlined />} style={{ backgroundColor: 'white', color: '#6366f1' }} />
                                    <div>
                                        <div style={{ fontWeight: 'bold', fontSize: 15 }}>SmartFarm Copilot</div>
                                        <div style={{ fontSize: 11, opacity: 0.9 }}>Online • Powered by Gemini</div>
                                    </div>
                                </div>
                                <Button
                                    type="text"
                                    icon={<CloseOutlined style={{ color: 'white' }} />}
                                    onClick={() => setIsOpen(false)}
                                />
                            </div>

                            {/* Messages Area */}
                            <div style={{
                                flex: 1,
                                padding: '16px',
                                overflowY: 'auto',
                                background: '#f9fafb',
                                display: 'flex',
                                flexDirection: 'column',
                                gap: 12
                            }}>
                                {messages.map(msg => (
                                    <div
                                        key={msg.id}
                                        style={{
                                            display: 'flex',
                                            justifyContent: msg.sender === 'user' ? 'flex-end' : 'flex-start'
                                        }}
                                    >
                                        <div style={{
                                            maxWidth: '80%',
                                            padding: '10px 14px',
                                            borderRadius: 14,
                                            fontSize: 14,
                                            lineHeight: 1.5,
                                            background: msg.sender === 'user' ? '#6366f1' : 'white',
                                            color: msg.sender === 'user' ? 'white' : '#1f2937',
                                            border: msg.sender === 'ai' ? '1px solid #e5e7eb' : 'none',
                                            boxShadow: '0 2px 4px rgba(0,0,0,0.05)',
                                            borderBottomRightRadius: msg.sender === 'user' ? 2 : 14,
                                            borderBottomLeftRadius: msg.sender === 'ai' ? 2 : 14,
                                        }}>
                                            {msg.text}
                                        </div>
                                    </div>
                                ))}
                                {isLoading && (
                                    <div style={{ display: 'flex', justifyContent: 'flex-start' }}>
                                        <div style={{ background: 'white', padding: '8px 16px', borderRadius: 14, border: '1px solid #e5e7eb' }}>
                                            <Spin size="small" /> <span style={{ marginLeft: 8, fontSize: 12, color: '#6b7280' }}>Đang suy nghĩ...</span>
                                        </div>
                                    </div>
                                )}
                                <div ref={messagesEndRef} />
                            </div>

                            {/* Input Area */}
                            <div style={{ padding: 12, borderTop: '1px solid #f0f0f0', background: 'white' }}>
                                <Input.Search
                                    placeholder="Hỏi hoặc ra lệnh (vd: Bật bơm 5p)..."
                                    enterButton={<SendOutlined />}
                                    size="large"
                                    value={input}
                                    onChange={e => setInput(e.target.value)}
                                    onSearch={handleSend}
                                    loading={isLoading}
                                    disabled={isLoading}
                                />
                            </div>
                        </Card>
                    </motion.div>
                )}
            </AnimatePresence>
        </>
    );
};

export default ChatWidget;