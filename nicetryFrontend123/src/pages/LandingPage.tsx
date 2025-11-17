// src/pages/LandingPage.tsx
import React, { useEffect } from 'react';
import { Button, Row, Col, Typography, Card } from 'antd';
import { useNavigate, Link } from 'react-router-dom';
import { ArrowRight, BarChart, Bot, BrainCircuit } from 'lucide-react';
import { motion } from 'framer-motion';
import { isAuthenticated } from '../utils/auth';
import AppFooter from '../layout/AppFooter';
import { type Easing } from 'framer-motion';


const { Title, Paragraph } = Typography;

/**
 * ✨ Design goals
 * - Giữ nguyên logic điều hướng & bố cục, chỉ làm đẹp giao diện
 * - Hero glassmorphism + gradient, icon cards có hover động, CTA gradient hiện đại
 * - Tận dụng CSS variables có sẵn; thêm một số biến fallback nếu thiếu
 */

// ====== Motion variants ======
const containerVariants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: { staggerChildren: 0.2 } },
};

const itemVariants = {
    hidden: { y: 20, opacity: 0 },
    visible: { y: 0, opacity: 1, transition: { duration: 0.6 } },
};

const floatVariant = {
    initial: { y: 0, opacity: 0.7 },
    animate: {
        y: [0, -10, 0],
        opacity: [0.6, 0.85, 0.6],
        transition: {
            duration: 6,
            repeat: Infinity,
            ease: 'easeInOut' as Easing // ✅ SỬA LẠI DÒNG NÀY
        },
    },
};

// ====== Feature Card ======
const FeatureCard = ({ icon, title, description }: { icon: React.ReactNode; title: string; description: string }) => (
    <motion.div whileHover={{ y: -10 }}>
        <Card
            bordered={false}
            style={{
                background: 'var(--card-bg, rgba(255,255,255,0.55))',
                backdropFilter: 'blur(10px)',
                WebkitBackdropFilter: 'blur(10px)',
                height: '100%',
                borderRadius: '20px',
                boxShadow: '0 10px 30px rgba(0,0,0,0.08)'
            }}
        >
            <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 18 }}>
                <div
                    style={{
                        width: 54,
                        height: 54,
                        borderRadius: 14,
                        display: 'grid',
                        placeItems: 'center',
                        background:
                            'linear-gradient(135deg, var(--primary, #635bff), var(--primary-2, #8b5cf6))',
                        boxShadow: '0 8px 20px rgba(99,91,255,0.25)'
                    }}
                >
                    <div style={{ color: 'white' }}>{icon}</div>
                </div>
                <Title level={4} style={{ margin: 0 }}>{title}</Title>
            </div>
            <Paragraph type="secondary" style={{ margin: 0, fontSize: 16, lineHeight: 1.7 }}>{description}</Paragraph>
        </Card>
    </motion.div>
);

const LandingPage: React.FC = () => {
    const navigate = useNavigate();

    useEffect(() => {
        if (isAuthenticated()) {
            navigate('/dashboard');
        }
    }, [navigate]);

    return (
        <div className="landing-page enhanced">
            {/* ===== Header ===== */}
            <header className="landing-header glass">
                <Link to="/" className="landing-logo">
                    <span className="gradient-text">SmartFarm</span>
                </Link>
                <div className="landing-nav">
                    <Button type="text" size="large" onClick={() => navigate('/login')}>Đăng nhập</Button>
                    <Button type="primary" size="large" className="btn-gradient" onClick={() => navigate('/register')}>Bắt đầu miễn phí</Button>
                </div>
            </header>

            {/* ===== Hero ===== */}
            <section className="landing-hero fx">
                {/* Floating orbs / particles */}
                <motion.div className="orb orb-1" variants={floatVariant} initial="initial" animate="animate" />
                <motion.div className="orb orb-2" variants={floatVariant} initial="initial" animate="animate" />
                <motion.div className="orb orb-3" variants={floatVariant} initial="initial" animate="animate" />
                <div className="grain" />

                <Row justify="center" align="middle" style={{ height: '100%', position: 'relative' }}>
                    <Col xs={22} md={20} lg={16} xl={14} style={{ textAlign: 'center' }}>
                        <motion.div variants={containerVariants} initial="hidden" animate="visible">
                            <motion.h1
                                variants={itemVariants}
                                className="hero-title"
                                style={{
                                    fontSize: 'clamp(2.7rem, 5vw, 4.8rem)',
                                    fontWeight: 900,
                                    lineHeight: 1.15,
                                    marginBottom: '1.25rem',
                                }}
                            >
                                <span className="text-glow">Nền Tảng IoT Cho Nông Trại Của Tương Lai</span>
                            </motion.h1>

                            <motion.p
                                variants={itemVariants}
                                className="hero-subtitle"
                                style={{
                                    fontSize: '1.2rem',
                                    color: 'var(--hero-sub, #2f3b52)',
                                    fontWeight: 500,
                                    maxWidth: 820,
                                    margin: '0 auto',
                                }}
                            >
                                Giám sát, tự động hóa và tối ưu hóa trang trại của bạn với sức mạnh của dữ liệu thời gian thực và trí tuệ nhân tạo.
                            </motion.p>

                            <motion.div variants={itemVariants} style={{ marginTop: '2.2rem' }}>
                                <Button
                                    type="primary"
                                    size="large"
                                    shape="round"
                                    className="btn-cta"
                                    onClick={() => navigate('/register')}
                                    style={{ height: 56, padding: '0 42px', fontSize: 18, fontWeight: 600 }}
                                >
                                    Khám phá ngay <ArrowRight size={20} style={{ marginLeft: 8 }} />
                                </Button>
                            </motion.div>
                        </motion.div>
                    </Col>
                </Row>
            </section>

            {/* ===== Features ===== */}
            <section className="landing-features pretty">
                <div className="landing-container">
                    <Title level={2} style={{ textAlign: 'center', marginBottom: 18 }}>
                        <span className="section-badge">Vì sao chọn chúng tôi</span>
                    </Title>
                    <Title level={2} style={{ textAlign: 'center', marginBottom: 60 }}>
                        Tất cả công cụ bạn cần, ở một nơi
                    </Title>
                    <Row gutter={[32, 32]} justify="center">
                        <Col xs={24} md={12} lg={8}>
                            <FeatureCard
                                icon={<BarChart size={28} />}
                                title="Giám sát Thời gian thực"
                                description="Theo dõi các chỉ số quan trọng như nhiệt độ, độ ẩm, pH từ bất cứ đâu, bất cứ lúc nào qua dashboard trực quan."
                            />
                        </Col>
                        <Col xs={24} md={12} lg={8}>
                            <FeatureCard
                                icon={<Bot size={28} />}
                                title="Tự động hóa Thông minh"
                                description="Thiết lập các quy tắc để tự động bật/tắt máy bơm, quạt, đèn... tiết kiệm thời gian và công sức vận hành."
                            />
                        </Col>
                        <Col xs={24} md={12} lg={8}>
                            <FeatureCard
                                icon={<BrainCircuit size={28} />}
                                title="Phân tích & Dự đoán AI"
                                description="Nhận các gợi ý tối ưu hóa, chẩn đoán bệnh cây và dự đoán về sức khỏe cây trồng từ mô hình AI của chúng tôi."
                            />
                        </Col>
                    </Row>
                </div>
            </section>

            {/* ===== CTA ===== */}
            <section className="landing-cta shine">
                <div className="landing-container" style={{ textAlign: 'center' }}>
                    <Title level={2} style={{ marginBottom: 12 }}>Sẵn sàng để cách mạng hóa trang trại của bạn?</Title>
                    <Paragraph type="secondary" style={{ fontSize: '1.1rem', marginTop: 8 }}>
                        Tham gia cùng hàng ngàn nông dân hiện đại khác và đưa nông trại của bạn lên một tầm cao mới.
                    </Paragraph>
                    <Button
                        type="primary"
                        size="large"
                        shape="round"
                        className="btn-gradient"
                        onClick={() => navigate('/register')}
                        style={{ marginTop: 22, height: 52, padding: '0 34px', fontSize: 16, fontWeight: 600 }}
                    >
                        Bắt đầu miễn phí
                    </Button>
                </div>
            </section>

            <AppFooter />

            {/* ===== Styles (scoped) ===== */}
            <style>{`
        :root {
          --primary: #6366f1; /* indigo-500 */
          --primary-2: #8b5cf6; /* violet-500 */
          --secondary-light: rgba(255,255,255,0.6);
          --foreground-light: #0f172a;
          --hero-sub: #2f3b52;
        }

        .enhanced .gradient-text {
          background: linear-gradient(90deg, var(--primary), var(--primary-2));
          -webkit-background-clip: text; background-clip: text; color: transparent;
          font-weight: 800;
          letter-spacing: 0.2px;
        }

        .landing-header.glass {
          position: sticky; top: 0; z-index: 40;
          display: flex; align-items: center; justify-content: space-between;
          padding: 16px 28px; margin: 0 auto; max-width: 1200px;
          background: rgba(255,255,255,0.6);
          backdrop-filter: blur(10px); -webkit-backdrop-filter: blur(10px);
          border-radius: 16px; margin-top: 16px;
          box-shadow: 0 6px 20px rgba(0,0,0,0.06);
        }

        .landing-hero.fx {
          height: calc(90vh - 73px);
          display: flex; align-items: center; justify-content: center; position: relative; overflow: hidden;
          background-image:
            linear-gradient(rgba(255,255,255,0.45), rgba(255,255,255,0.88)),
            url('https://images.unsplash.com/photo-1492496913980-501348b61469?q=80&w=2787&auto-format&fit=crop');
          background-size: cover; background-position: center;
        }

        .orb { position: absolute; filter: blur(40px); opacity: 0.55; }
        .orb-1 { width: 380px; height: 380px; border-radius: 50%;
          background: radial-gradient(circle at 30% 30%, rgba(99,102,241,0.7), transparent 60%);
          top: -60px; left: -60px; }
        .orb-2 { width: 300px; height: 300px; border-radius: 50%;
          background: radial-gradient(circle at 70% 30%, rgba(139,92,246,0.6), transparent 60%);
          right: -80px; top: 120px; }
        .orb-3 { width: 260px; height: 260px; border-radius: 50%;
          background: radial-gradient(circle at 50% 70%, rgba(34,197,94,0.45), transparent 60%);
          left: 20%; bottom: -80px; }
        .grain { position: absolute; inset: 0; pointer-events: none;
          background-image: url('data:image/svg+xml;utf8,\
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200">\
              <filter id="n"><feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="2" stitchTiles="stitch"/></filter>\
              <rect width="100%" height="100%" filter="url(%23n)" opacity="0.03"/>\
            </svg>');
          mix-blend-mode: multiply; }

        .hero-title .text-glow {
          background: linear-gradient(90deg, #0f172a 0%, #1f2937 50%, #0f172a 100%);
          -webkit-background-clip: text; background-clip: text; color: transparent;
          text-shadow: 0 10px 30px rgba(0,0,0,0.08);
        }

        .btn-cta { 
          background: linear-gradient(90deg, var(--primary), var(--primary-2));
          border: none; box-shadow: 0 12px 30px rgba(99,91,255,0.25);
        }
        .btn-cta:hover { filter: brightness(1.05); transform: translateY(-1px); }

        .btn-gradient {
          background: linear-gradient(90deg, var(--primary), var(--primary-2));
          border: none; box-shadow: 0 10px 24px rgba(99,91,255,0.22);
        }

        .landing-features.pretty { padding: 84px 0; background: linear-gradient(180deg, #f7f7fb 0%, #ffffff 100%); }
        .section-badge { display:inline-block; font-size: 12px; letter-spacing: .12em; text-transform: uppercase;
          color: var(--primary); background: rgba(99,102,241,0.12); padding: 8px 12px; border-radius: 999px; }

        .landing-cta.shine { padding: 90px 0; background:
          radial-gradient(1200px 300px at 50% 0%, rgba(99,102,241,0.08), transparent 60%),
          linear-gradient(180deg, #ffffff, #f9fafb);
        }

        @media (max-width: 768px) {
          .landing-header.glass { border-radius: 12px; padding: 12px 16px; }
          .landing-features.pretty { padding: 64px 0; }
        }
      `}</style>
        </div>
    );
};

export default LandingPage;
