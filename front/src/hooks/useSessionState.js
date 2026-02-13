import { useState, useEffect } from 'react';

/**
 * Custom hook для управління станом з автоматичним збереженням в sessionStorage
 * @param {string} storageKey - Ключ для збереження в sessionStorage
 * @param {object} defaultState - Початковий стан
 * @param {number} expirationMinutes - Час життя даних в хвилинах (за замовчуванням 30)
 * @returns {[object, function]} - [state, setState]
 */
const useSessionState = (storageKey, defaultState, expirationMinutes = 30) => {
    const [state, setState] = useState(() => {
        try {
            const saved = sessionStorage.getItem(storageKey);
            if (saved) {
                const parsed = JSON.parse(saved);
                // Перевіряємо чи дані не старіші ніж expirationMinutes
                if (Date.now() - parsed.timestamp < expirationMinutes * 60 * 1000) {
                    // Повертаємо збережений стан без timestamp
                    const { timestamp, ...savedState } = parsed;
                    return {
                        ...defaultState,
                        ...savedState
                    };
                }
            }
        } catch (error) {
            console.warn(`Failed to load ${storageKey}:`, error);
        }
        return defaultState;
    });

    // Зберігаємо стан в sessionStorage при кожній зміні
    useEffect(() => {
        try {
            sessionStorage.setItem(storageKey, JSON.stringify({
                ...state,
                timestamp: Date.now()
            }));
        } catch (error) {
            console.warn(`Failed to save ${storageKey}:`, error);
        }
    }, [state, storageKey]);

    // Очищуємо sessionStorage при розмонтуванні компонента
    useEffect(() => {
        return () => {
            try {
                sessionStorage.removeItem(storageKey);
            } catch (error) {
                console.warn(`Failed to clear ${storageKey}:`, error);
            }
        };
    }, [storageKey]);

    return [state, setState];
};

export default useSessionState;
