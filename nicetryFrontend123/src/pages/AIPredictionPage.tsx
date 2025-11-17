// src/pages/AIPredictionPage.tsx

import React, { useEffect, useState } from 'react';
import { Row, Col, Card, Spin, Typography, Result, Button, Empty, Alert, Upload, message as antdMessage, Modal, Image } from 'antd';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { BulbOutlined, WarningOutlined, CameraOutlined, CloudUploadOutlined } from '@ant-design/icons';
import type { RcFile } from 'antd/es/upload/interface';
import { getAIPredictions, diagnosePlantDisease } from '../api/aiService';
import type { AIPredictionResponse } from '../types/ai';
import { useFarm } from '../context/FarmContext';

const { Title, Paragraph, Text } = Typography;
const { Dragger } = Upload;

const AIPredictionPage: React.FC = () => {
    const { farmId } = useFarm();
    const [predictionData, setPredictionData] = useState<AIPredictionResponse | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // ✅ THÊM: State cho chức năng chẩn đoán bệnh
    const [diagnosing, setDiagnosing] = useState(false);
    const [diagnosisResult, setDiagnosisResult] = useState<any>(null);
    const [uploadedImage, setUploadedImage] = useState<string | null>(null);
    const [isModalVisible, setIsModalVisible] = useState(false);

    useEffect(() => {
        if (!farmId) {
            setLoading(false);
            return;
        }

        setLoading(true);
        getAIPredictions(farmId)
            .then(response => {
                if (response.data.success && response.data.data) {
                    setPredictionData(response.data.data);
                    setError(null);
                } else {
                    setError(response.data.message || "AI Service không khả dụng");
                    setPredictionData(null);
                }
            })
            .catch(err => {
                console.error("Failed to fetch AI predictions:", err);
                const errorMsg = err.response?.data?.message || "Không thể kết nối đến AI Service";
                setError(errorMsg);
                setPredictionData(null);
            })
            .finally(() => setLoading(false));
    }, [farmId]);

    // ✅ THÊM: Helper function để parse confidence
    const parseConfidence = (confidence: any): number | null => {
        if (typeof confidence === 'number') {
            return confidence;
        }
        if (typeof confidence === 'string') {
            // Loại bỏ ký tự % và parse thành number
            const numValue = parseFloat(confidence.replace('%', ''));
            return isNaN(numValue) ? null : numValue;
        }
        return null;
    };

    // ✅ THÊM: Xử lý upload ảnh chẩn đoán bệnh
    const handleDiagnose = async (file: RcFile) => {
        setDiagnosing(true);
        setDiagnosisResult(null);

        // Hiển thị preview ảnh
        const reader = new FileReader();
        reader.onload = (e) => setUploadedImage(e.target?.result as string);
        reader.readAsDataURL(file);

        try {
            const response = await diagnosePlantDisease(file);

            if (response.data.success) {
                // ✅ THÊM: Normalize confidence trước khi lưu
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

        return false; // Prevent default upload behavior
    };

    // Loading state
    if (loading) {
        return (
            <div style={{
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                minHeight: '60vh'
            }}>
                <Spin size="large" />
            </div>
        );
    }

    // Error state
    if (error) {
        return (
            <div style={{ padding: '24px' }}>
                <Alert
                    message="AI Service chưa sẵn sàng"
                    description={
                        <>
                            <p>{error}</p>
                            <p style={{ marginTop: 8 }}>
                                <WarningOutlined /> Có thể AI/ML model đang được huấn luyện hoặc dịch vụ đang bảo trì.
                            </p>
                        </>
                    }
                    type="warning"
                    showIcon
                    action={
                        <Button type="primary" onClick={() => window.location.reload()}>
                            Thử lại
                        </Button>
                    }
                />
            </div>
        );
    }

    // Null data state
    if (!predictionData || !predictionData.predictions || !predictionData.suggestion) {
        return (
            <Result
                status="404"
                title="Không có dữ liệu dự đoán"
                subTitle="AI chưa có đủ dữ liệu lịch sử để đưa ra dự đoán."
                extra={
                    <Button type="primary" onClick={() => window.location.reload()}>
                        Tải lại
                    </Button>
                }
            />
        );
    }

    // ✅ SỬA: Xử lý dữ liệu biểu đồ linh hoạt hơn
    const validPredictions = predictionData.predictions.filter(p => {
        // Chấp nhận prediction nếu có ít nhất 1 giá trị hợp lệ
        return p.predicted_temperature !== null ||
            p.predicted_humidity !== null ||
            p.predicted_soil_moisture !== null;
    });

    const chartData = validPredictions.map((p, index) => {
        // ✅ Nếu không có timestamp, tạo timestamp giả dựa trên index
        const timestamp = p.timestamp
            ? new Date(p.timestamp)
            : new Date(Date.now() + index * 60 * 60 * 1000); // Mỗi điểm cách nhau 1 giờ

        return {
            time: timestamp.toLocaleTimeString('vi-VN', {
                hour: '2-digit',
                minute: '2-digit',
                hour12: false
            }),
            'Nhiệt độ Dự đoán (°C)': p.predicted_temperature ?? undefined,
            'Độ ẩm Đất Dự đoán (%)': p.predicted_soil_moisture ?? undefined,
        };
    });

    // ✅ THÊM: Kiểm tra có dữ liệu nào để vẽ biểu đồ không
    const hasChartData = chartData.some(point =>
        point['Nhiệt độ Dự đoán (°C)'] !== undefined ||
        point['Độ ẩm Đất Dự đoán (%)'] !== undefined
    );

    return (
        <div style={{ padding: '24px' }}>
            <Title level={2}>Dự đoán & Gợi ý từ AI</Title>
            <Paragraph type="secondary">Phân tích và dự đoán các chỉ số môi trường dựa trên Machine Learning.</Paragraph>

            <Row gutter={[16, 16]}>
                {/* ✅ THÊM: Card chẩn đoán bệnh cây */}
                <Col span={24}>
                    <Card
                        title={
                            <span>
                                <CameraOutlined style={{ marginRight: 8 }} />
                                Chẩn đoán Bệnh Cây từ Hình ảnh
                            </span>
                        }
                        style={{ backgroundColor: '#f6ffed', border: '1px solid #b7eb8f' }}
                    >
                        <Dragger
                            name="image"
                            accept="image/*"
                            beforeUpload={handleDiagnose}
                            showUploadList={false}
                            disabled={diagnosing}
                        >
                            <p className="ant-upload-drag-icon">
                                <CloudUploadOutlined style={{ color: '#52c41a', fontSize: 48 }} />
                            </p>
                            <p className="ant-upload-text">
                                {diagnosing ? 'AI đang phân tích...' : 'Kéo thả hoặc click để tải ảnh lên'}
                            </p>
                            <p className="ant-upload-hint">
                                Hỗ trợ các định dạng: JPG, PNG, JPEG. Ảnh rõ nét của lá cây hoặc cả cây.
                            </p>
                        </Dragger>

                        {diagnosing && (
                            <div style={{ textAlign: 'center', marginTop: 16 }}>
                                <Spin tip="AI đang phân tích hình ảnh..." />
                            </div>
                        )}
                    </Card>
                </Col>

                {/* Card hiển thị Gợi ý */}
                <Col span={24}>
                    <Card style={{ backgroundColor: '#e6f4ff', border: '1px solid #91caff' }}>
                        <Typography>
                            <Title level={4}>
                                <BulbOutlined style={{ color: '#1677ff' }} /> Gợi ý thông minh
                            </Title>
                            <Paragraph style={{ fontSize: '16px' }}>
                                {predictionData.suggestion.message}
                            </Paragraph>
                            <Text strong>Hành động đề xuất: </Text>
                            <Text code>{predictionData.suggestion.action}</Text>
                            {predictionData.suggestion.confidence && (
                                <>
                                    <br />
                                    <Text strong>Độ tin cậy: </Text>
                                    <Text>{(predictionData.suggestion.confidence * 100).toFixed(0)}%</Text>
                                </>
                            )}
                        </Typography>
                    </Card>
                </Col>

                {/* ✅ SỬA: Card hiển thị Biểu đồ dự đoán */}
                <Col span={24}>
                    <Card
                        title="Biểu đồ Dự đoán Môi trường"
                        extra={
                            !hasChartData && (
                                <Alert
                                    message="AI đang học từ dữ liệu cảm biến"
                                    type="info"
                                    showIcon
                                    style={{ marginBottom: 0 }}
                                />
                            )
                        }
                    >
                        {hasChartData ? (
                            <>
                                <Text type="secondary" style={{ display: 'block', marginBottom: 16 }}>
                                    Dự đoán dựa trên xu hướng dữ liệu gần đây. Độ chính xác sẽ tăng theo thời gian.
                                </Text>
                                <ResponsiveContainer width="100%" height={400}>
                                    <LineChart data={chartData}>
                                        <CartesianGrid strokeDasharray="3 3" />
                                        <XAxis
                                            dataKey="time"
                                            label={{ value: 'Thời gian', position: 'insideBottom', offset: -5 }}
                                        />
                                        <YAxis
                                            yAxisId="left"
                                            stroke="#ff4d4f"
                                            label={{ value: 'Nhiệt độ (°C)', angle: -90, position: 'insideLeft' }}
                                        />
                                        <YAxis
                                            yAxisId="right"
                                            orientation="right"
                                            stroke="#82ca9d"
                                            label={{ value: 'Độ ẩm đất (%)', angle: 90, position: 'insideRight' }}
                                        />
                                        <Tooltip
                                            formatter={(value: any, name: string) => {
                                                if (value === undefined) return ['Không có dữ liệu', name];
                                                return [value.toFixed(1), name];
                                            }}
                                        />
                                        <Legend />

                                        {/* ✅ Chỉ hiển thị line nếu có data */}
                                        {chartData.some(p => p['Nhiệt độ Dự đoán (°C)'] !== undefined) && (
                                            <Line
                                                yAxisId="left"
                                                type="monotone"
                                                dataKey="Nhiệt độ Dự đoán (°C)"
                                                stroke="#ff4d4f"
                                                strokeWidth={2}
                                                strokeDasharray="5 5"
                                                dot={{ r: 4 }}
                                                activeDot={{ r: 6 }}
                                            />
                                        )}

                                        {chartData.some(p => p['Độ ẩm Đất Dự đoán (%)'] !== undefined) && (
                                            <Line
                                                yAxisId="right"
                                                type="monotone"
                                                dataKey="Độ ẩm Đất Dự đoán (%)"
                                                stroke="#82ca9d"
                                                strokeWidth={2}
                                                strokeDasharray="5 5"
                                                dot={{ r: 4 }}
                                                activeDot={{ r: 6 }}
                                            />
                                        )}
                                    </LineChart>
                                </ResponsiveContainer>

                                {/* ✅ THÊM: Hiển thị thông tin data có sẵn */}
                                <div style={{ marginTop: 16, padding: '12px', backgroundColor: '#fafafa', borderRadius: 8 }}>
                                    <Text type="secondary">
                                        📊 Dữ liệu dự đoán:{' '}
                                        {chartData.some(p => p['Nhiệt độ Dự đoán (°C)'] !== undefined) &&
                                            <Text>Nhiệt độ ✓ </Text>}
                                        {chartData.some(p => p['Độ ẩm Đất Dự đoán (%)'] !== undefined) &&
                                            <Text>Độ ẩm đất ✓</Text>}
                                    </Text>
                                </div>
                            </>
                        ) : (
                            <Empty
                                description={
                                    <div>
                                        <p>AI đang học từ dữ liệu cảm biến của bạn</p>
                                        <Text type="secondary">
                                            Biểu đồ dự đoán sẽ hiển thị sau khi hệ thống thu thập đủ dữ liệu lịch sử (khoảng 24-48 giờ)
                                        </Text>
                                    </div>
                                }
                                image={Empty.PRESENTED_IMAGE_SIMPLE}
                            />
                        )}
                    </Card>
                </Col>

                {/* Card thông tin Model AI */}
                {predictionData.model_info && (
                    <Col span={24}>
                        <Card title="Thông tin Model AI">
                            <Row gutter={16}>
                                <Col span={12}>
                                    <p>
                                        <Text strong>Loại model:</Text> {predictionData.model_info.model_type || 'N/A'}
                                    </p>
                                    <p>
                                        <Text strong>Version:</Text> {predictionData.model_info.version || 'N/A'}
                                    </p>
                                    <p>
                                        <Text strong>Số lượng features:</Text> {predictionData.model_info.features_used || 'N/A'}
                                    </p>
                                </Col>
                                <Col span={12}>
                                    <p>
                                        <Text strong>R² Score:</Text> {predictionData.model_info.r2_score || 'N/A'}
                                    </p>
                                    <p>
                                        <Text strong>Trained on:</Text> {predictionData.model_info.trained_on || 'N/A'}
                                    </p>
                                </Col>
                            </Row>
                        </Card>
                    </Col>
                )}
            </Row>

            {/* Modal chẩn đoán (giữ nguyên) */}
            <Modal
                title="Kết quả Chẩn đoán Bệnh Cây"
                open={isModalVisible}
                onCancel={() => setIsModalVisible(false)}
                footer={[
                    <Button key="close" type="primary" onClick={() => setIsModalVisible(false)}>
                        Đóng
                    </Button>
                ]}
                width={700}
            >
                {diagnosisResult && (
                    <div>
                        <Row gutter={16}>
                            <Col span={12}>
                                {uploadedImage && (
                                    <Image
                                        src={uploadedImage}
                                        alt="Uploaded"
                                        style={{ width: '100%', borderRadius: 8 }}
                                    />
                                )}
                            </Col>
                            <Col span={12}>
                                <Title level={4}>Kết quả:</Title>
                                <Paragraph>
                                    <Text strong>Bệnh phát hiện: </Text>
                                    <Text type={diagnosisResult.disease ? 'danger' : 'success'}>
                                        {diagnosisResult.disease || 'Cây khỏe mạnh'}
                                    </Text>
                                </Paragraph>

                                {diagnosisResult.confidence !== null && diagnosisResult.confidence !== undefined && (
                                    <Paragraph>
                                        <Text strong>Độ tin cậy: </Text>
                                        <Text>
                                            {typeof diagnosisResult.confidence === 'number'
                                                ? `${diagnosisResult.confidence.toFixed(1)}%`
                                                : diagnosisResult.confidence}
                                        </Text>
                                    </Paragraph>
                                )}

                                {diagnosisResult.treatment && (
                                    <Paragraph>
                                        <Text strong>Hướng xử lý: </Text>
                                        {diagnosisResult.treatment}
                                    </Paragraph>
                                )}
                                {diagnosisResult.description && (
                                    <Paragraph type="secondary">
                                        {diagnosisResult.description}
                                    </Paragraph>
                                )}
                            </Col>
                        </Row>
                    </div>
                )}
            </Modal>
        </div>
    );
};

export default AIPredictionPage;