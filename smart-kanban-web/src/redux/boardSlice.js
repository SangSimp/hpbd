import { createSlice } from '@reduxjs/toolkit';

const initialState = {
    boardData: null, 
    columns: [],     
    status: 'idle',
    error: null
};

const boardSlice = createSlice({
    name: 'board',
    initialState,
    reducers: {
        setBoardData: (state, action) => {
            state.boardData = action.payload.boardInfo;
            state.boardInfo = action.payload.boardInfo;
            state.columns = action.payload.columns;
        },

        updateCardPosition: (state, action) => {
            const { cardId, sourceColumnId, destColumnId, newIndex } = action.payload;

            // 1. Tìm cột gốc và cột đích
            const sourceCol = state.columns.find(c => c.id === sourceColumnId || c.Id === sourceColumnId);
            const destCol = state.columns.find(c => c.id === destColumnId || c.Id === destColumnId);

            if (!sourceCol || !destCol) return;

            // 2. Tìm thẻ đang bị kéo
            const cardIndex = sourceCol.cards.findIndex(c => c.id === cardId || c.Id === cardId);
            if (cardIndex === -1) return;
            const [movedCard] = sourceCol.cards.splice(cardIndex, 1);

            movedCard.columnId = destColumnId;
            destCol.cards.splice(newIndex, 0, movedCard);
        },

        updateCardDetails: (state, action) => {
            const { columnId, cardId, updatedData } = action.payload;

            const column = state.columns.find(c => c.id === columnId || c.Id === columnId);
            if (column) {
                const cardIndex = column.cards.findIndex(c => c.id === cardId || c.Id === cardId);
                if (cardIndex !== -1) {
                    column.cards[cardIndex] = { ...column.cards[cardIndex], ...updatedData };
                }
            }
        },
        addCardToColumn: (state, action) => {
            const { columnId, newCard } = action.payload;
            const column = state.columns.find(c => c.id === columnId);
            if (column) {
                if (!column.cards) column.cards = [];
                column.cards.push(newCard);
            }
        },
        
        addColumn: (state, action) => {
            state.columns.push(action.payload);
        },
        deleteCard: (state, action) => {
            const cardIdToDelete = action.payload;
            state.columns.forEach(column => {
                if (column.cards) {
                    column.cards = column.cards.filter(c => (c.id || c.Id) !== cardIdToDelete);
                }
            });
        },
        deleteColumn: (state, action) => {
            const columnIdToDelete = action.payload;
            state.columns = state.columns.filter(c => (c.id || c.Id) !== columnIdToDelete);
        },
        updateColumnTitle: (state, action) => {
            const { columnId, newTitle } = action.payload;
            const column = state.columns.find(c => (c.id || c.Id) === columnId);
            if (column) {
                column.title = newTitle;
                column.Title = newTitle; 
            }
        },

        moveColumn: (state, action) => {
            const { sourceIndex, destIndex } = action.payload;

            const newColumns = Array.from(state.columns);
            const [removedColumn] = newColumns.splice(sourceIndex, 1);
            newColumns.splice(destIndex, 0, removedColumn);

            state.columns = newColumns;
        }
    }
});

export const { setBoardData, updateCardPosition, addChecklistsToCard,
    addCardToColumn, addColumn, updateCardDetails, deleteCard, deleteColumn, updateColumnTitle
    , moveColumn} = boardSlice.actions;
export default boardSlice.reducer;
