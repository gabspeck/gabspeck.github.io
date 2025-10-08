let dragging = null;

const boardKey = 'kanban-board'

let saveTimeout = null;

const defaultBoard = {
    _layoutVersion: 1,
    name: 'Zero dep Kanban board',
    id: crypto.randomUUID(),
    columns: [
        {
            id: crypto.randomUUID(),
            name: 'To do',
            cards: [{id: crypto.randomUUID(), body: 'Walk the dog'}]
        },
        {
            id: crypto.randomUUID(),
            name: 'Doing',
            cards: [{id: crypto.randomUUID(), body: 'Look for a new apartment'}]
        },
        {
            id: crypto.randomUUID(),
            name: 'Done',
            cards: [{id: crypto.randomUUID(), body: 'Pay the rent'}]
        }
    ]
}

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
            console.log(p, newValue)
            renderBoard(target)
            void saveBoard(target)
            return Reflect.set(target, p, newValue, receiver)
        }
    })
    renderBoard(board)
}

function renderBoard(board) {
    const main = document.querySelector('#app')
    main.setAttribute('data-id', board.id)
    document.querySelector('#board-name').innerText = board.name

    const children = board.columns.map(column => renderColumn(column))
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

function renderColumn(column) {
    const template = document.getElementById('column-template')
    const fragment = template.content.cloneNode(true)
    fragment.querySelector('.column').setAttribute('data-id', column.id)
    fragment.querySelector('.column-name').innerText = column.name

    fragment.querySelector('.add-card-form').addEventListener('submit', (ev) => {
        ev.preventDefault()
        const columnId = ev.target.closest('.column').getAttribute('data-id')
        const data = new FormData(ev.target)
        board.columns.find(col => col.id === columnId).cards.push({
            id: crypto.randomUUID(),
            body: data.get('cardText')
        })
        board.columns = board.columns
        ev.target.reset()
    })

    const cardList = fragment.querySelector('.card-list')
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
        if (list) {
            const columnId = list.closest('.column').getAttribute('data-id')
            const newColumn = board.columns.find(col => col.id === columnId)
            const cardId = dragging.getAttribute('data-id')
            // rewrite storage object to be more relational-like and make this easier...
            console.log(cardId)
            board.columns = board.columns
        }
    })
    for (const card of column.cards) {
        cardList.appendChild(renderCard(card))
    }

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

