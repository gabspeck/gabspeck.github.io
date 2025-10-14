let dragging = null;

const boardKey = 'kanban-board'

let saveTimeout = null;

function makeDefaultBoard() {
    const toDoId = crypto.randomUUID();
    const doingId = crypto.randomUUID();
    const doneId = crypto.randomUUID();

    const toDoCardId = crypto.randomUUID();
    const doingCardId = crypto.randomUUID();
    const doneCardId = crypto.randomUUID();

    return {
        name: 'Zero dep Kanban board',
        columns: {
            [toDoId]: {id: toDoId, name: 'To do'},
            [doingId]: {id: doingId, name: 'Doing'},
            [doneId]: {id: doneId, name: 'Done'}
        },
        cards: {
            [toDoCardId]: {id: toDoCardId, columnId: toDoId, body: 'Walk the dog'},
            [doingCardId]: {id: doingCardId, columnId: doingId, body: 'Look for a new apartment'},
            [doneCardId]: {id: doneCardId, columnId: doneId, body: 'Pay the rent'}
        }
    };
}

const defaultBoard = makeDefaultBoard()

let board = null;

// const autosaver = new MutationObserver(() => {
//     Object.assign(board, {
//         name: document.getElementById('board-name').textContent,
//         id: document.getElementById('app').getAttribute('data-id'),
//         columns: document.querySelectorAll('.column').values().map(col => ({
//             id: col.getAttribute('data-id'),
//             name: col.querySelector('.column-name').innerText,
//             cards: col.querySelectorAll('.card-item').values().map(card => ({
//                 id: card.getAttribute('data-id'),
//                 body: card.innerText
//             })).toArray()
//         })).toArray()
//     })
// })

document.addEventListener('DOMContentLoaded', () => {
    initializeBoard()
    // autosaver.observe(document.getElementById('app'), {subtree: true, childList: true})
});

function initializeBoard() {
    const storedBoard = localStorage.getItem(boardKey)
    let parsedBoard = null
    try {
        parsedBoard = JSON.parse(storedBoard)
    } catch {
        console.error("could not parse stored board; resetting")
    }

    const _board = parsedBoard ?? defaultBoard

    board = new Proxy(_board, {
        set(target, p, newValue, receiver) {
            console.log(target, p)
            renderBoard(target)
            void saveBoard(target)
            return Reflect.set(target, p, newValue, receiver)
        }
    })
    renderBoard(board)
}

function renderBoard(board) {
    const main = document.querySelector('#app')
    document.querySelector('#board-name').innerText = board.name

    const children = Object.values(board.columns).map(column => renderColumn(column, Object.values(board.cards).filter(card => card.columnId === column.id)))
    main.replaceChildren(...children)

}

async function saveBoard(board) {
    if (saveTimeout) {
        clearTimeout(saveTimeout)
    }
    saveTimeout = setTimeout(async () => {
        await localStorage.setItem(boardKey, JSON.stringify(board))
        saveTimeout = null
    }, 100)
}

function renderColumn(column, cards) {
    const template = document.getElementById('column-template')
    const fragment = template.content.cloneNode(true)
    fragment.querySelector('.column').setAttribute('data-id', column.id)
    fragment.querySelector('.column-name').innerText = column.name
    const cardElements = cards.map(c => renderCard(c))
    fragment.querySelector('.card-list').replaceChildren(...cardElements)

    fragment.querySelector('.add-card-form').addEventListener('submit', (ev) => {
        ev.preventDefault()
        const columnId = ev.target.closest('.column').getAttribute('data-id')
        const data = new FormData(ev.target)
        const newCardId = crypto.randomUUID()
        board.cards[newCardId] = {
            id: newCardId,
            columnId,
            body: data.get('cardText')
        }
        board.cards = board.cards
        ev.target.reset()
    })

    fragment.querySelector('.actions').addEventListener('submit', ev => {
        ev.preventDefault()
        switch (ev.submitter.value) {
            case 'edit':
                const columnNameElement = ev.submitter.closest('.column').querySelector('.column-name')
                const tempForm = document.getElementById('temp-input').content.cloneNode(true).querySelector('form')
                const onSubmit = (ev) => {
                    ev.preventDefault()
                    const columnId = ev.target.closest('.column').getAttribute('data-id')
                    board.columns[columnId].name = tempForm.querySelector('input').value
                    board.columns = board.columns
                }
                tempForm.addEventListener('submit', onSubmit)
                const tempInput = tempForm.querySelector('input')
                tempInput.addEventListener('blur', onSubmit)
                tempInput.value = columnNameElement.innerText
                columnNameElement.replaceWith(tempForm)
                tempInput.focus()
                console.log(tempForm)
                break;
            case 'delete':
                break;
        }
    })

    const cardList = fragment.querySelector('.card-list')
    cardList.setAttribute('data-id', column.id)
    cardList.addEventListener('dragover', (ev) => {
        if (!dragging) {
            return
        }
        ev.preventDefault()
        ev.dataTransfer.dropEffect = 'move'
    })
    cardList.addEventListener('drop', (ev) => {
        ev.preventDefault()
        const list = ev.target.closest('.card-list')
        if (dragging && list) {
            const listId = list.getAttribute('data-id')
            const cardId = dragging.getAttribute('data-id')
            if (board.cards[cardId]) {
                board.cards[cardId].columnId = listId
                board.cards = board.cards
            }
        }
    })
    return fragment
}

function renderCard(card) {
    const template = document.getElementById('card-template')
    const fragment = template.content.cloneNode(true)
    const cardItem = fragment.querySelector('.card-item')
    cardItem.setAttribute('data-id', card.id)
    cardItem.innerText = card.body
    cardItem.addEventListener('dragstart', (ev) => {
        dragging = ev.target
        ev.dataTransfer.effectAllowed = 'move'
        ev.target.classList.add('dragging')
    })
    cardItem.addEventListener('dragend', () => {
        dragging = null;
    })
    return fragment
}

