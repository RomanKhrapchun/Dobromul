import React, {useRef} from 'react';
import Button from "../common/Button/Button.jsx";
import {useNavigate, useParams} from "react-router-dom";
import './PrintCard.css'
import logo from '../../assets/qr-code.png'
import useFetch from "../../hooks/useFetch.jsx";
import {
    alt_qr_code,
    phone_number_GU_DPS,
    GU_DPS_region, 
    telegram_name, 
    telegram_url,
    territory_title,
    territory_title_instrumental, 
    website_name, 
    website_url,
    COMMUNITY_NAME  // 🆕 ДОДАНО
} from "../../utils/communityConstants.jsx";
import {generateIcon, iconMap, STATUS} from "../../utils/constants.jsx";
import Loader from "../Loader/Loader.jsx";
import PageError from "../../pages/ErrorPage/PageError.jsx";
import {formatDateUa} from "../../utils/function.js";

const backIcon = generateIcon(iconMap.back)
const printIcon = generateIcon(iconMap.print)

const PrintCard = () => {
    const ref = useRef(null)
    const {debtId} = useParams()
    const navigate = useNavigate()
    const {error, status, data} = useFetch(`api/debtor/print/${debtId}`)
    
    const handlePrint = () => {
        if(ref.current) {
            ref.current.style.display = 'none';
        }
        window.print();
        if(ref.current) {
            ref.current.style.display = 'flex';
        }
    };

    if (status === STATUS.PENDING) {
        return <Loader/>
    }

    if (status === STATUS.ERROR) {
        return <div style={{display: 'flex', justifyContent: 'center', minHeight: '100vh'}}>
            <PageError statusError={error.status} title={error.message}/>
        </div>
    }

    // Обчислюємо загальну суму
    let totalSum = 0;
    if (data.debt && Array.isArray(data.debt)) {
        totalSum = data.debt.reduce((sum, debt) => sum + (parseFloat(debt.amount) || 0), 0).toFixed(2);
    }

    return (
        <React.Fragment>
            {status === STATUS.SUCCESS ? (
                <React.Fragment>
                    <div className="print-card">
                        <div className="print-card__header">
                            <p className="print-card__name">{data.name}</p>
                            <p className="print-card__id">і.к. ХХХХХХХ{data?.identification}</p>
                        </div>
                        
                        <div className="print-card__title">Інформаційне повідомлення</div>
                        
                        {/* ═══════════════════════════════════════════════════════ */}
                        {/* 🆕 ЗМІНА: Для Славська змінюємо відправника             */}
                        {/* ═══════════════════════════════════════════════════════ */}
                        <p>&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;
                            {data.debt?.[0]?.custom_sender || territory_title} повідомляє, що відповідно до даних ГУ ДПС у {GU_DPS_region},
                            станом {formatDateUa(data.date)} у Вас наявна заборгованість до бюджету {territory_title_instrumental},&nbsp; а саме:
                        </p>

                        {/* Блок з боргами */}
                        {data.debt && Array.isArray(data.debt) && data.debt.length ?
                            data.debt.map((debt, index) => {
                                return (
                                    <React.Fragment key={index}>
                                        <p>&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;{index + 1}. {debt.debtText}</p>
                                        <p style={{textAlign: 'center'}}>
                                            <strong>{debt.requisiteText}</strong>
                                        </p>
                                        <table className="print-card__table">
                                            <tbody>
                                                {debt.table && Array.isArray(debt.table) ?
                                                    debt.table.map((row, idx) => (
                                                        <tr key={idx}>
                                                            <td style={{width: '50%'}}>{row.label}</td>
                                                            <td style={{width: '50%'}}>{row.value}</td>
                                                        </tr>
                                                    )) : null
                                                }
                                            </tbody>
                                        </table>
                                    </React.Fragment>
                                )
                            }) : null
                        }

                        {/* ═══════════════════════════════════════════════════════ */}
                        {/* 🆕 НОВИЙ БЛОК: Текст про Самбірську податкову           */}
                        {/* (з'явиться тільки для Добромиля)                        */}
                        {/* ═══════════════════════════════════════════════════════ */}
                        {data.debt && data.debt.length > 0 && data.debt[data.debt.length - 1]?.sambir_notice && (
                            <>
                                <p>&nbsp;</p>
                                <p style={{fontWeight: 'bold'}}>
                                    {data.debt[data.debt.length - 1].sambir_notice}
                                </p>
                            </>
                        )}
                        {/* ═══════════════════════════════════════════════════════ */}
                        {/* 🆕 КІНЕЦЬ НОВОГО БЛОКУ                                   */}
                        {/* ═══════════════════════════════════════════════════════ */}

                        {/* Адреса боржника */}
                        {data.address && (
                            <p><strong>Адреса боржника: </strong>{data.address}</p>
                        )}

                        {/* Загальна сума */}
                        <div className="print-card__total">
                            <strong>Загальна сума боргу по всіх платежах: {totalSum} грн</strong>
                        </div>

                        {/* Контактна інформація */}
                        <p>
                            &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;В разі виникнення питань по даній заборгованості, 
                            звертайтесь у ГУ ДПС у {GU_DPS_region} за номером телефона {phone_number_GU_DPS}.
                        </p>
                        
                        <p>
                            &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;Просимо терміново погасити утворену Вами заборгованість 
                            до бюджету {territory_title_instrumental}. Несвоєчасна сплата суми заборгованості 
                            призведе до нарахувань штрафних санкцій та пені.
                        </p>

                        <p>
                            &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;Перевірити заборгованість можна у застосунках 
                            «{website_name}» {website_url} або через чат-бот в Telegram «{telegram_name}» {telegram_url}. 
                            Вони дозволяють отримати актуальну інформацію щодо стану вашої заборгованості 
                            та оплатити її онлайн за допомогою QR-коду, що розміщений нижче.
                        </p>

                        {/* QR код */}
                        <div className="print-card__qrcode">
                            <img src={logo} alt={alt_qr_code}/>
                        </div>
                    </div>

                    {/* Кнопки управління */}
                    <div ref={ref} className="print-card__controls">
                        <Button onClick={() => navigate(-1)} icon={backIcon}>
                            Назад
                        </Button>
                        <Button onClick={handlePrint} icon={printIcon}>
                            Друк
                        </Button>
                    </div>
                </React.Fragment>
            ) : null}
        </React.Fragment>
    );
}

export default PrintCard;