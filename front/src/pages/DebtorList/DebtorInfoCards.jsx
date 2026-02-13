import React, { useState } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

const DebtorInfoCards = ({ 
  totalDebtors = 0, 
  debtsByType = {
    residential_debt: 0,
    non_residential_debt: 0,
    land_debt: 0,
    orenda_debt: 0,
    mpz: 0
  },
  totalDebt = 0,
  chartData = []
}) => {
  
  // Ініціалізуємо стан з Local Storage або за замовчуванням true
  const [isVisible, setIsVisible] = useState(() => {
    try {
      const saved = localStorage.getItem('debtorStatsVisible');
      // Перевіряємо на null, undefined та порожній рядок
      if (saved !== null && saved !== undefined && saved !== '') {
        return JSON.parse(saved);
      }
      return true;
    } catch (error) {
      // Якщо виникла помилка при парсингу, повертаємо значення за замовчуванням
      console.warn('Error parsing localStorage value for debtorStatsVisible:', error);
      return true;
    }
  });
  const [modalChart, setModalChart] = useState(null);

  const toggleVisibility = () => {
    const newValue = !isVisible;
    setIsVisible(newValue);
    // Зберігаємо новий стан в Local Storage
    try {
      localStorage.setItem('debtorStatsVisible', JSON.stringify(newValue));
    } catch (error) {
      console.warn('Error saving to localStorage:', error);
    }
  };

  const openModal = (chartType) => {
    setModalChart(chartType);
  };

  const closeModal = () => {
    setModalChart(null);
  };
  
  function getDebtTypeLabel(key) {
    const labels = {
      residential_debt: 'Житлова',
      non_residential_debt: 'Нежитлова', 
      land_debt: 'Земля',
      orenda_debt: 'Оренда',
      mpz: 'МПЗ'
    };
    return labels[key] || key;
  }

  function getDebtTypeColor(key) {
    const colors = {
      residential_debt: '#e74c3c',
      non_residential_debt: '#f39c12',
      land_debt: '#27ae60',
      orenda_debt: '#3498db',
      mpz: '#16a085'
    };
    return colors[key] || '#95a5a6';
  }

  function formatNumber(num) {
    return new Intl.NumberFormat('uk-UA', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(num);
  }

  function formatMonthLabel(dateStr) {
    const [year, month, day] = dateStr.split('-');
    
    // Якщо це січень (01) - показуємо з роком
    if (month === '01') {
      return `${year}-${month}`;
    }
    
    // Для решти місяців - тільки місяць-день
    return `${month}-${day}`;
  }
  const formattedChartData = chartData.map((item, index) => ({
    ...item,
    month: formatMonthLabel(item.month)
  }));

  const sortedDebts = Object.entries(debtsByType)
    .map(([key, value]) => ({
      key,
      value,
      percentage: (value / totalDebt) * 100,
      label: getDebtTypeLabel(key),
      color: getDebtTypeColor(key)
    }))
    .sort((a, b) => b.value - a.value);

  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      return (
        <div style={{
          backgroundColor: 'rgba(255, 255, 255, 0.95)',
          padding: '10px',
          border: '2px solid #ddd',
          borderRadius: '8px',
          boxShadow: '0 2px 8px rgba(0,0,0,0.15)'
        }}>
          <p style={{ margin: '0 0 8px 0', fontWeight: 'bold', color: '#333' }}>{label}</p>
          {payload.map((entry, index) => (
            <p key={index} style={{ margin: '4px 0', color: entry.color, fontSize: '13px' }}>
              {entry.name}: <strong>{formatNumber(entry.value)}</strong>
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

  const GeneralChart = ({ inModal = false }) => (
    <ResponsiveContainer width="100%" height={inModal ? 500 : 200}>
      <LineChart data={formattedChartData} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#e0e0e0" vertical={false} />
        <XAxis 
          dataKey="month" 
          stroke="#666" 
          style={{ fontSize: inModal ? '14px' : '11px' }}
        />
        <YAxis 
          yAxisId="left"
          stroke="#27ae60" 
          style={{ fontSize: inModal ? '14px' : '11px' }}
          tickFormatter={(value) => `${(value / 1000).toFixed(0)}k`}
        />
        <YAxis 
          yAxisId="right"
          orientation="right"
          stroke="#e74c3c" 
          style={{ fontSize: inModal ? '14px' : '11px' }}
        />
        <Tooltip content={<CustomTooltip />} />
        <Legend 
          wrapperStyle={{ fontSize: inModal ? '14px' : '11px' }}
          iconType="line"
        />
        <Line 
          yAxisId="left"
          type="monotone" 
          dataKey="totalDebt" 
          stroke="#27ae60" 
          strokeWidth={2}
          name="Загальна сума заборгованостей"
          dot={{ fill: '#27ae60', r: 4 }}
          activeDot={{ r: 6 }}
        />
        <Line 
          yAxisId="right"
          type="monotone" 
          dataKey="totalDebtors" 
          stroke="#e74c3c" 
          strokeWidth={2}
          name="Загальна кількість боржників"
          dot={{ fill: '#e74c3c', r: 4 }}
          activeDot={{ r: 6 }}
        />
      </LineChart>
    </ResponsiveContainer>
  );

  const DetailedChart = ({ inModal = false }) => (
    <ResponsiveContainer width="100%" height={inModal ? 500 : 200}>
      <LineChart data={formattedChartData} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#e0e0e0" vertical={false} />
        <XAxis 
          dataKey="month" 
          stroke="#666"
          style={{ fontSize: inModal ? '14px' : '11px' }}
        />
        <YAxis 
          stroke="#666"
          style={{ fontSize: inModal ? '14px' : '11px' }}
          tickFormatter={(value) => `${(value / 1000).toFixed(0)}k`}
        />
        <Tooltip content={<CustomTooltip />} />
        <Legend 
          wrapperStyle={{ fontSize: inModal ? '14px' : '11px' }}
          iconType="line"
        />
        <Line 
          type="monotone" 
          dataKey="residential" 
          stroke="#e74c3c" 
          strokeWidth={2}
          name="Житлова"
          dot={{ fill: '#e74c3c', r: 3 }}
          activeDot={{ r: 5 }}
        />
        <Line 
          type="monotone" 
          dataKey="nonResidential" 
          stroke="#f39c12" 
          strokeWidth={2}
          name="Нежитлова"
          dot={{ fill: '#f39c12', r: 3 }}
          activeDot={{ r: 5 }}
        />
        <Line 
          type="monotone" 
          dataKey="land" 
          stroke="#27ae60" 
          strokeWidth={2}
          name="Земельна"
          dot={{ fill: '#27ae60', r: 3 }}
          activeDot={{ r: 5 }}
        />
        <Line 
          type="monotone" 
          dataKey="orenda" 
          stroke="#3498db" 
          strokeWidth={2}
          name="Оренда"
          dot={{ fill: '#3498db', r: 3 }}
          activeDot={{ r: 5 }}
        />
        <Line 
          type="monotone" 
          dataKey="mpz" 
          stroke="#16a085" 
          strokeWidth={2}
          name="МПЗ"
          dot={{ fill: '#16a085', r: 3 }}
          activeDot={{ r: 5 }}
        />
      </LineChart>
    </ResponsiveContainer>
  );

  return (
    <div style={{ marginBottom: '20px' }}>
      <style>{`
        .debt-card {
          outline: none !important;
          box-shadow: none !important;
          user-select: none !important;
          -webkit-user-select: none !important;
          -moz-user-select: none !important;
          -ms-user-select: none !important;
          pointer-events: none !important;
          box-sizing: initial !important;
        }
        .debt-card *, .debt-card *:hover, .debt-card *:focus, .debt-card *:active {
          outline: none !important;
          box-shadow: none !important;
          box-sizing: initial !important;
          user-select: none !important;
          pointer-events: none !important;
        }
        .chart-container {
          cursor: pointer;
          transition: all 0.2s ease;
        }
        .chart-container:hover {
          transform: scale(1.02);
        }
      `}</style>

      <div style={{ 
        display: 'flex', 
        justifyContent: 'flex-end', 
        marginBottom: '10px' 
      }}>
        <button
          onClick={toggleVisibility}
          style={{
            backgroundColor: 'var(--blue)',
            color: '#fff',
            border: 'none',
            borderRadius: '6px',
            padding: '8px 16px',
            fontSize: '12px',
            cursor: 'pointer',
            fontWeight: '600',
            textTransform: 'uppercase',
            transition: 'all 0.2s ease',
          }}
          onMouseEnter={(e) => {
            e.target.style.backgroundColor = 'var(--blue)';
            e.target.style.transform = 'translateY(-1px)';
          }}
          onMouseLeave={(e) => {
            e.target.style.backgroundColor = 'var(--blue)';
            e.target.style.transform = 'translateY(0)';
          }}
        >
          {isVisible ? '📊 Приховати статистику' : '📊 Показати статистику'}
        </button>
      </div>

      <div style={{
        maxHeight: isVisible ? '600px' : '0',
        overflow: 'hidden',
        transition: 'all 0.3s ease-in-out',
        opacity: isVisible ? 1 : 0,
        transform: isVisible ? 'translateY(0)' : 'translateY(-10px)'
      }}>
        <div style={{ 
          display: 'grid', 
          gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', 
          gap: '15px'
        }}>
          
          <div style={{
            borderRadius: '12px',
            padding: '15px',
            backgroundColor: '#f2f2f2',
            color: '#333',
            minHeight: '250px',
            display: 'flex',
            flexDirection: 'column',
            border: '3px solid #27ae60',
            boxShadow: 'none',
            gap: '15px'
          }}>
            <div 
              className="chart-container"
              onClick={() => openModal('general')}
              style={{
                flex: 1,
                backgroundColor: '#f2f2f2',
                borderRadius: '8px',
                padding: '10px',
                border: '2px solid #27ae60',
                minHeight: '180px'
              }}
            >
              <div style={{ 
                fontSize: '11px', 
                marginBottom: '5px', 
                color: '#27ae60', 
                fontWeight: 'bold',
                textAlign: 'center'
              }}>
                Графік 1: Загальна тенденція
              </div>
              <GeneralChart />
            </div>

            <div 
              className="chart-container"
              onClick={() => openModal('detailed')}
              style={{
                flex: 1,
                backgroundColor: '#f2f2f2',
                borderRadius: '8px',
                padding: '10px',
                border: '2px solid #3498db',
                minHeight: '180px'
              }}
            >
              <div style={{ 
                fontSize: '11px', 
                marginBottom: '5px', 
                color: '#3498db', 
                fontWeight: 'bold',
                textAlign: 'center'
              }}>
                Графік 2: Детальна інформація
              </div>
              <DetailedChart />
            </div>
          </div>

          <div style={{
            borderRadius: '12px',
            padding: '15px',
            backgroundColor: '#f2f2f2',
            minHeight: '250px',
            display: 'flex',
            flexDirection: 'column',
            gap: '15px',
            border: '3px solid #e74c3c',
            boxShadow: 'none'
          }}>
            <div style={{
              flex: 1,
              backgroundColor: '#f2f2f2',
              borderRadius: '8px',
              padding: '15px',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'center',
              alignItems: 'center',
              border: '2px solid #27ae60'
            }}>
              <div style={{ fontSize: '12px', marginBottom: '8px', textTransform: 'uppercase', color: '#666' }}>
                ЗАГАЛЬНА КІЛЬКІСТЬ БОРЖНИКІВ
              </div>
              <div style={{ fontSize: '36px', fontWeight: 'bold', color: '#27ae60' }}>
                {totalDebtors.toLocaleString('uk-UA')}
              </div>
            </div>

            <div style={{
              flex: 1,
              backgroundColor: '#f2f2f2',
              borderRadius: '8px',
              padding: '15px',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'center',
              alignItems: 'center',
              border: '2px solid #e74c3c'
            }}>
              <div style={{ fontSize: '12px', marginBottom: '8px', textTransform: 'uppercase', color: '#666' }}>
                ЗАГАЛЬНА СУМА ЗАБОРГОВАНОСТІ
              </div>
              <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#e74c3c' }}>
                {formatNumber(totalDebt)} грн
              </div>
            </div>
          </div>

          <div style={{
            borderRadius: '12px',
            padding: '15px',
            backgroundColor: '#f2f2f2',
            color: '#333',
            fontWeight: 'bold',
            textAlign: 'center',
            minHeight: '250px',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            position: 'relative',
            overflow: 'hidden',
            border: '3px solid #f39c12',
            boxShadow: 'none'
          }}>
            <div style={{ 
              fontSize: '12px', 
              marginBottom: '15px', 
              textTransform: 'uppercase',
              textAlign: 'center',
              color: '#666'
            }}>
              РОЗПОДІЛ ЗАБОРГОВАНОСТІ
            </div>
            
            <div style={{
              width: '100%',
              height: '20px',
              backgroundColor: '#f0f0f0',
              borderRadius: '10px',
              overflow: 'hidden',
              marginBottom: '15px',
              position: 'relative',
              display: 'flex'
            }}>
              {sortedDebts.map((debt) => (
                <div
                  key={debt.key}
                  style={{
                    width: `${debt.percentage}%`,
                    height: '100%',
                    backgroundColor: debt.color,
                    transition: 'all 0.3s ease'
                  }}
                  title={`${debt.label}: ${formatNumber(debt.value)} ₴ (${debt.percentage.toFixed(1)}%)`}
                />
              ))}
            </div>

            <div style={{ 
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
              gap: '8px',
              fontSize: '11px'
            }}>
              {sortedDebts.map((debt) => (
                <div 
                  key={debt.key} 
                  className="debt-card"
                  style={{
                    backgroundColor: '#f2f2f2',
                    color: '#333',
                    padding: '10px 8px',
                    borderRadius: '8px',
                    textAlign: 'center',
                    position: 'relative',
                    border: `2px solid ${debt.color}`,
                    boxShadow: 'none',
                    outline: 'none'
                  }}>
                  <div style={{
                    position: 'absolute',
                    left: '0',
                    top: '0',
                    bottom: '0',
                    width: '4px',
                    backgroundColor: debt.color,
                    borderRadius: '8px 0 0 8px'
                  }}></div>
                  
                  <div style={{ 
                    fontWeight: 'bold', 
                    marginBottom: '4px',
                    color: debt.color,
                    fontSize: '12px'
                  }}>
                    {debt.label}
                  </div>
                  <div style={{ 
                    fontSize: '13px', 
                    fontWeight: 'bold',
                    color: '#333',
                    marginBottom: '2px'
                  }}>
                    {formatNumber(debt.value)} ₴
                  </div>
                  <div style={{ 
                    fontSize: '11px', 
                    color: debt.color,
                    fontWeight: '600'
                  }}>
                    {debt.percentage.toFixed(1)}%
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {modalChart && (
        <div 
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.7)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 9999,
            padding: '20px'
          }}
          onClick={closeModal}
        >
          <div 
            style={{
              backgroundColor: '#fff',
              borderRadius: '12px',
              padding: '30px',
              maxWidth: '1200px',
              width: '100%',
              maxHeight: '90vh',
              overflow: 'auto',
              position: 'relative'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={closeModal}
              style={{
                position: 'absolute',
                top: '15px',
                right: '15px',
                backgroundColor: '#e74c3c',
                color: '#fff',
                border: 'none',
                borderRadius: '6px',
                padding: '10px 20px',
                fontSize: '14px',
                cursor: 'pointer',
                fontWeight: 'bold',
                zIndex: 10
              }}
            >
              ✕ Закрити
            </button>

            <h2 style={{ 
              marginTop: 0, 
              marginBottom: '20px', 
              color: '#333',
              fontSize: '24px'
            }}>
              {modalChart === 'general' ? 'Графік 1: Загальна тенденція' : 'Графік 2: Детальна інформація'}
            </h2>
            
            {modalChart === 'general' ? <GeneralChart inModal={true} /> : <DetailedChart inModal={true} />}
          </div>
        </div>
      )}
    </div>
  );
};

export default DebtorInfoCards;