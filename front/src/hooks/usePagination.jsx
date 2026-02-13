import {useMemo} from 'react';

// Безпечна функція для генерації діапазону чисел
const createRange = (start, end) => {
    const length = end - start + 1;
    return Array.from({ length }, (_, idx) => idx + start);
};

const DOTS = '...';

export const usePagination = ({
                                  totalCount,
                                  pageSize,
                                  siblingCount = 1,
                                  currentPage
                              }) => {

    const paginationRange = useMemo(() => {
        //console.log('usePagination input:', { totalCount, pageSize, siblingCount, currentPage });
        
        // Валідація вхідних параметрів
        const safeTotalCount = Math.max(1, parseInt(totalCount, 10) || 1);
        const safePageSize = Math.max(1, parseInt(pageSize, 10) || 1);
        const safeSiblingCount = Math.max(1, parseInt(siblingCount, 10) || 1);
        const safeCurrentPage = Math.max(1, parseInt(currentPage, 10) || 1);
        
        // console.log('usePagination safe values:', { 
        //     safeTotalCount, safePageSize, safeSiblingCount, safeCurrentPage 
        // });
        
        const totalPageCount = Math.ceil(safeTotalCount / safePageSize);
        // console.log('Total page count:', totalPageCount);
        
        // Якщо недостатньо сторінок для пагінації
        if (totalPageCount <= 1) {
            // console.log('Not enough pages, returning [1]');
            return [1];
        }
        
        const totalPageNumbers = safeSiblingCount + 5;
        
        // Якщо загальна кількість номерів сторінок більша або дорівнює загальній кількості сторінок
        if (totalPageNumbers >= totalPageCount) {
            // console.log('Show all pages');
            const result = createRange(1, totalPageCount);
            // console.log('All pages result:', result);
            return result;
        }
        
        const leftSiblingIndex = Math.max(safeCurrentPage - safeSiblingCount, 1);
        const rightSiblingIndex = Math.min(safeCurrentPage + safeSiblingCount, totalPageCount);
        
        const shouldShowLeftDots = leftSiblingIndex > 2;
        const shouldShowRightDots = rightSiblingIndex < totalPageCount - 2;
        
        const firstPageIndex = 1;
        const lastPageIndex = totalPageCount;
        
        // console.log('Pagination logic:', {
        //     leftSiblingIndex,
        //     rightSiblingIndex,
        //     shouldShowLeftDots,
        //     shouldShowRightDots,
        //     firstPageIndex,
        //     lastPageIndex
        // });
        
        // Випадок 1: Немає лівих крапок, але є праві
        if (!shouldShowLeftDots && shouldShowRightDots) {
            let leftItemCount = 3 + 2 * safeSiblingCount;
            let leftRange = createRange(1, leftItemCount);
            const result = [...leftRange, DOTS, totalPageCount];
            // console.log('Case 1 result:', result);
            return result;
        }
        
        // Випадок 2: Є ліві крапки, але немає правих
        if (shouldShowLeftDots && !shouldShowRightDots) {
            let rightItemCount = 3 + 2 * safeSiblingCount;
            let rightRange = createRange(totalPageCount - rightItemCount + 1, totalPageCount);
            const result = [firstPageIndex, DOTS, ...rightRange];
            // console.log('Case 2 result:', result);
            return result;
        }
        
        // Випадок 3: Є і ліві, і праві крапки
        if (shouldShowLeftDots && shouldShowRightDots) {
            let middleRange = createRange(leftSiblingIndex, rightSiblingIndex);
            const result = [firstPageIndex, DOTS, ...middleRange, DOTS, lastPageIndex];
            // console.log('Case 3 result:', result);
            return result;
        }

        // Випадок 4: Немає ні лівих, ні правих крапок - показуємо всі сторінки
        if (!shouldShowLeftDots && !shouldShowRightDots) {
            const result = createRange(1, totalPageCount);
            // console.log('Case 4 - show all pages:', result);
            return result;
        }
        
        // ВАЖЛИВО: Fallback на випадок якщо жодна умова не спрацювала
        console.warn('No pagination case matched, using fallback');
        const fallbackResult = createRange(1, totalPageCount);
        return fallbackResult;
        
    }, [totalCount, pageSize, siblingCount, currentPage]);

    return paginationRange;
};