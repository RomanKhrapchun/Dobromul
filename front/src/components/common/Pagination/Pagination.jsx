import React from 'react';
import {usePagination} from "../../../hooks/usePagination";
import classNames from "classnames";
import Button from "../Button/Button";
import {generateIcon, iconMap} from "../../../utils/constants";
import {DOTS} from "../../../utils/function";

const prevIcon = generateIcon(iconMap.prev)
const nextIcon = generateIcon(iconMap.next)
const dotsIcon = generateIcon(iconMap.dots,'pagination__dots')

const Pagination = ({
                        style,
                        onPageChange,
                        totalCount = 1,
                        siblingCount = 2,
                        currentPage = 1,
                        pageSize = 25,
                        className
                    }) => {

    // Додаємо валідацію пропсів
    const safeTotalCount = Math.max(1, parseInt(totalCount, 10) || 1);
    const safeCurrentPage = Math.max(1, parseInt(currentPage, 10) || 1);
    const safePageSize = Math.max(1, parseInt(pageSize, 10) || 25);
    const safeSiblingCount = Math.max(1, parseInt(siblingCount, 10) || 2);

    // console.log('Pagination props debug:', {
    //     original: { totalCount, currentPage, pageSize, siblingCount },
    //     safe: { safeTotalCount, safeCurrentPage, safePageSize, safeSiblingCount }
    // });

    const classes = classNames("pagination pagination--center", className)
    const paginationRange = usePagination({
        currentPage: safeCurrentPage,
        totalCount: safeTotalCount,
        siblingCount: safeSiblingCount,
        pageSize: safePageSize
    });

    //console.log('Pagination range:', paginationRange);

    // Додаємо захист для paginationRange
    if (!paginationRange || !Array.isArray(paginationRange) || paginationRange.length < 1) {
        console.warn('Invalid pagination range:', paginationRange);
        return null;
    }

    if (safeCurrentPage === 0) {
        return null;
    }

    // ВИПРАВЛЕННЯ: Безпечне отримання lastPage
    const lastPageRaw = paginationRange[paginationRange.length - 1];
    const lastPage = parseInt(lastPageRaw, 10);
    
    // Якщо lastPage не є валідним числом, обчислюємо його самостійно
    const safeLast = isNaN(lastPage) ? Math.ceil(safeTotalCount / safePageSize) : lastPage;

    // console.log('Last page calculation:', {
    //     lastPageRaw,
    //     lastPage,
    //     safeLast,
    //     calculation: Math.ceil(safeTotalCount / safePageSize)
    // });

    const onNext = () => {
        const nextPage = safeCurrentPage + 1;
        if (nextPage <= safeLast) {
            onPageChange(nextPage);
        }
    };

    const onPrevious = () => {
        const prevPage = safeCurrentPage - 1;
        if (prevPage >= 1) {
            onPageChange(prevPage);
        }
    };

    return (
        <ul className={classes} style={style}>
            <li>
                <Button
                    aria-label={"Попередня сторінка"}
                    className="btn--secondary"
                    icon={prevIcon}
                    disabled={safeCurrentPage === 1}
                    onClick={onPrevious}/>
            </li>
            {paginationRange.map((pageNumber, index) => {
                if (pageNumber === DOTS) {
                    return <li key={`dots-${index}`}>
                        {dotsIcon}
                    </li>;
                }

                // Додаємо валідацію для pageNumber
                const safePageNumber = parseInt(pageNumber, 10);
                if (isNaN(safePageNumber)) {
                    console.warn('Invalid page number:', pageNumber);
                    return null;
                }

                return (
                    <li key={`page-${safePageNumber}`}>
                        <Button
                            className={classNames({
                                "btn--active": safePageNumber === safeCurrentPage,
                                "btn--secondary": safePageNumber !== safeCurrentPage
                            })}
                            onClick={() => onPageChange(safePageNumber)}>
                            {safePageNumber}
                        </Button>
                    </li>
                );
            })}
            <li>
                <Button
                    aria-label={"Наступна сторінка"}
                    className="btn--secondary"
                    icon={nextIcon}
                    disabled={safeCurrentPage >= safeLast}
                    onClick={onNext}/>
            </li>
        </ul>
    );
};

export default React.memo(Pagination);