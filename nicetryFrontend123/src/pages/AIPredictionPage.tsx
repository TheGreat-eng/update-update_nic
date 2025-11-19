// src/pages/AIPredictionPage.tsx
import React, { useEffect, useState } from 'react';
import { Row, Col, Card, Spin, Typography, Button, Empty, Alert, Upload, message as antdMessage, Modal, Image, Select, Space } from 'antd';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { BulbOutlined, WarningOutlined, CameraOutlined, CloudUploadOutlined, EnvironmentOutlined } from '@ant-design/icons';
import type { RcFile } from 'antd/es/upload/interface';
import { diagnosePlantDisease } from '../api/aiService';
import { getZonesByFarm } from '../api/zoneService';
import type { AIPredictionResponse } from '../types/ai';
import { useFarm } from '../context/FarmContext';
import { useQuery } from '@tanstack/react-query';
import api from '../api/axiosConfig';

const { Title, Paragraph, Text } = Typography;
const { Dragger } = Upload;
const { Option } = Select;

const AIPredictionPage: React.FC = () => {
    const { farmId } = useFarm();
    const [selectedZoneId, setSelectedZoneId] = useState<number | null>(null);

    // State cho dữ liệu AI
    const [predictionData, setPredictionData] = useState<AIPredictionResponse | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // State cho chẩn đoán bệnh
    const [diagnosing, setDiagnosing] = useState(false);
    const [diagnosisResult, setDiagnosisResult] = useState<any>(null);
    const [uploadedImage, setUploadedImage] = useState<string | null>(null);
    const [isModalVisible, setIsModalVisible] = useState(false);

    // 1. Fetch danh sách Zones
    const { data: zones } = useQuery({
        queryKey: ['farmZones', farmId],
        queryFn: () => farmId ? getZonesByFarm(farmId) : Promise.resolve([]),
        enabled: !!farmId
    });

    // 2. Fetch dữ liệu AI khi farmId hoặc selectedZoneId thay đổi
    useEffect(() => {
        const fetchPredictions = async () => {
            if (!farmId) {
                setLoading(false);
                return;
            }

            setLoading(true);
            setError(null);
            setPredictionData(null);

            try {
                // Gọi API với tham số zoneId (nếu có)
                // Lưu ý: Cần đảm bảo API getAIPredictions trong aiService hỗ trợ tham số thứ 2
                // Hoặc gọi trực tiếp qua api instance để linh hoạt
                const url = `/ai/predictions?farmId=${farmId}${selectedZoneId ? `&zoneId=${selectedZoneId}` : ''}`;
                const response = await api.get(url);

                if (response.data.success && response.data.data) {
                    setPredictionData(response.data.data);
                } else {
                    // Nếu success=false hoặc data null
                    setError(response.data.message || "AI Service không khả dụng hoặc thiếu dữ liệu.");
                }
            } catch (err: any) {
                console.error("Failed to fetch AI predictions:", err);
                const errorMsg = err.response?.data?.message || "Không thể kết nối đến AI Service";
                setError(errorMsg);
            } finally {
                setLoading(false);
            }
        };

        fetchPredictions();
    }, [farmId, selectedZoneId]);

    // Helper parse confidence
    const parseConfidence = (confidence: any): number | null => {
        if (typeof confidence === 'number') return confidence;
        if (typeof confidence === 'string') {
            const numValue = parseFloat(confidence.replace('%', ''));
            return isNaN(numValue) ? null : numValue;
        }
        return null;
    };

    // Xử lý upload ảnh
    const handleDiagnose = async (file: RcFile) => {
        setDiagnosing(true);
        setDiagnosisResult(null);

        const reader = new FileReader();
        reader.onload = (e) => setUploadedImage(e.target?.result as string);
        reader.readAsDataURL(file);

        try {
            const response = await diagnosePlantDisease(file);
            if (response.data.success) {
                const result = response.data.data;
                const normalizedResult = {
                    ...result,
                    confidence: parseConfidence(result.confidence),
                };
                setDiagnosisResult(normalizedResult);
                setIsModalVisible(true);
                antdMessage.success('Chẩn đoán thành công!');
            } else {
                antdMessage.error(response.data.message || 'Chẩn đoán thất bại');
            }
        } catch (err: any) {
            console.error('Diagnosis error:', err);
            antdMessage.error(err.response?.data?.message || 'Không thể kết nối đến AI Service');
        } finally {
            setDiagnosing(false);
        }
        return false;
    };

    // Xử lý dữ liệu biểu đồ
    const chartData = React.useMemo(() => {
        if (!predictionData?.predictions) return [];

        const validPredictions = predictionData.predictions.filter(p =>
            p.predicted_temperature !== null ||
            p.predicted_humidity !== null ||
            p.predicted_soil_moisture !== null
        );

        return validPredictions.map((p, index) => {
            const timestamp = p.timestamp
                ? new Date(p.timestamp)
                : new Date(Date.now() + index * 60 * 60 * 1000);

            return {
                time: timestamp.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit', hour12: false }),
                'Nhiệt độ Dự đoán (°C)': p.predicted_temperature ?? undefined,
                'Độ ẩm Đất Dự đoán (%)': p.predicted_soil_moisture ?? undefined,
            };
        });
    }, [predictionData]);

    const hasChartData = chartData.length > 0;

    return (
        <div style={{ padding: '24px' }}>
            {/* Header & Filter */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
                <div>
                    <Title level={2} style={{ margin: 0 }}>Dự đoán & Gợi ý từ AI</Title>
                    <Text type="secondary">Phân tích Machine Learning cho {selectedZoneId ? 'khu vực đã chọn' : 'toàn bộ nông trại'}.</Text>
                </div>

                <Select
                    style={{ width: 220 }}
                    placeholder="Chọn khu vực"
                    allowClear
                    onChange={(val) => setSelectedZoneId(val)}
                    value={selectedZoneId}
                    suffixIcon={<EnvironmentOutlined style={{ fontSize: 14, opacity: 0.5 }} />}
                >
                    <Option value={null}>🏠 Toàn bộ nông trại</Option>
                    {zones?.map(z => (
                        <Option key={z.id} value={z.id}>{z.name}</Option>
                    ))}
                </Select>
            </div>

            {/* Loading State */}
            {loading ? (
                <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '400px' }}>
                    <Spin size="large" tip="AI đang phân tích dữ liệu..." />
                </div>
            ) : error ? (
                <Alert
                    message="AI Service chưa sẵn sàng"
                    description={
                        <>
                            <p>{error}</p>
                            <p style={{ marginTop: 8 }}>
                                <WarningOutlined /> Hãy đảm bảo khu vực này có đủ dữ liệu lịch sử để AI phân tích.
                            </p>
                        </>
                    }
                    type="warning"
                    showIcon
                    style={{ marginBottom: 24 }}
                />
            ) : !predictionData ? (
                <Empty description="Chưa có dữ liệu dự đoán. Vui lòng chọn nông trại khác hoặc thử lại sau." />
            ) : (
                <Row gutter={[16, 16]}>
                    {/* Card Chẩn đoán bệnh */}
                    <Col span={24}>
                        <Card
                            title={<span><CameraOutlined style={{ marginRight: 8 }} /> Chẩn đoán Bệnh Cây từ Hình ảnh</span>}
                            style={{ backgroundColor: '#f6ffed', border: '1px solid #b7eb8f' }}
                        >
                            <Dragger
                                name="image"
                                accept="image/*"
                                beforeUpload={handleDiagnose}
                                showUploadList={false}
                                disabled={diagnosing}
                                style={{ padding: '20px 0' }}
                            >
                                <p className="ant-upload-drag-icon">
                                    <CloudUploadOutlined style={{ color: '#52c41a', fontSize: 48 }} />
                                </p>
                                <p className="ant-upload-text">Kéo thả hoặc click để tải ảnh lên</p>
                                <p className="ant-upload-hint">Hỗ trợ JPG, PNG. AI sẽ phát hiện sâu bệnh trên lá cây.</p>
                            </Dragger>
                            {diagnosing && <div style={{ textAlign: 'center', marginTop: 16 }}><Spin tip="Đang chẩn đoán..." /></div>}
                        </Card>
                    </Col>

                    {/* Card Gợi ý */}
                    <Col span={24}>
                        <Card style={{ backgroundColor: '#e6f4ff', border: '1px solid #91caff' }}>
                            <Title level={4}><BulbOutlined style={{ color: '#1677ff' }} /> Gợi ý thông minh</Title>
                            <Paragraph style={{ fontSize: '16px' }}>{predictionData.suggestion.message}</Paragraph>
                            <Space direction="vertical" size={0}>
                                <Text>Hành động đề xuất: <Text code strong>{predictionData.suggestion.action}</Text></Text>
                                {predictionData.suggestion.confidence && (
                                    <Text type="secondary">Độ tin cậy: {(predictionData.suggestion.confidence * 100).toFixed(0)}%</Text>
                                )}
                            </Space>
                        </Card>
                    </Col>

                    {/* Biểu đồ */}
                    <Col span={24}>
                        <Card title="Biểu đồ Dự đoán Môi trường (24h tới)">
                            {hasChartData ? (
                                <ResponsiveContainer width="100%" height={400}>
                                    <LineChart data={chartData}>
                                        <CartesianGrid strokeDasharray="3 3" />
                                        <XAxis dataKey="time" />
                                        <YAxis yAxisId="left" label={{ value: 'Nhiệt độ (°C)', angle: -90, position: 'insideLeft' }} />
                                        <YAxis yAxisId="right" orientation="right" label={{ value: 'Độ ẩm đất (%)', angle: 90, position: 'insideRight' }} />
                                        <Tooltip />
                                        <Legend />
                                        <Line yAxisId="left" type="monotone" dataKey="Nhiệt độ Dự đoán (°C)" stroke="#ff4d4f" strokeWidth={2} dot={{ r: 4 }} />
                                        <Line yAxisId="right" type="monotone" dataKey="Độ ẩm Đất Dự đoán (%)" stroke="#82ca9d" strokeWidth={2} dot={{ r: 4 }} />
                                    </LineChart>
                                </ResponsiveContainer>
                            ) : (
                                <Empty description="Không đủ dữ liệu để vẽ biểu đồ dự đoán." />
                            )}
                        </Card>
                    </Col>

                    {/* Model Info */}
                    {predictionData.model_info && (
                        <Col span={24}>
                            <Card size="small" title="Thông tin Model AI">
                                <Row gutter={16}>
                                    <Col span={8}><Text type="secondary">Model Type:</Text> <Text strong>{predictionData.model_info.model_type}</Text></Col>
                                    <Col span={8}><Text type="secondary">R² Score:</Text> <Text strong>{predictionData.model_info.r2_score}</Text></Col>
                                    <Col span={8}><Text type="secondary">Trained on:</Text> <Text strong>{predictionData.model_info.trained_on}</Text></Col>
                                </Row>
                            </Card>
                        </Col>
                    )}
                </Row>
            )}

            {/* Modal Kết quả Chẩn đoán */}
            <Modal
                title="Kết quả Chẩn đoán"
                open={isModalVisible}
                onCancel={() => setIsModalVisible(false)}
                footer={[<Button key="close" type="primary" onClick={() => setIsModalVisible(false)}>Đóng</Button>]}
                width={700}
            >
                {diagnosisResult && (
                    <Row gutter={16}>
                        <Col span={10}>
                            {uploadedImage && <Image src={uploadedImage} style={{ borderRadius: 8 }} />}
                        </Col>
                        <Col span={14}>
                            <Title level={4} style={{ marginTop: 0 }}>Kết quả: {diagnosisResult.disease}</Title>
                            <Paragraph><Text strong>Độ tin cậy:</Text> {typeof diagnosisResult.confidence === 'number' ? `${diagnosisResult.confidence.toFixed(1)}%` : 'N/A'}</Paragraph>
                            <Paragraph><Text strong>Hướng xử lý:</Text> {diagnosisResult.treatment}</Paragraph>
                            <Paragraph type="secondary">{diagnosisResult.description}</Paragraph>
                        </Col>
                    </Row>
                )}
            </Modal>
        </div>
    );
};

export default AIPredictionPage;