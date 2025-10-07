let dragging = null;

const boardKey = 'kanban-board'

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

const autosaver = new MutationObserver(() => {
    const newBoard = {
        _layoutVersion: 1,
        name: document.getElementById('board-name').textContent,
        id: document.getElementById('app').getAttribute('data-id'),
        columns: document.querySelectorAll('.column').values().map(col => ({
            id: col.getAttribute('data-id'),
            name: col.querySelector('.column-name').innerText,
            cards: col.querySelectorAll('.card-item').values().map(card => ({
                id: card.getAttribute('data-id'),
                body: card.innerText
            })).toArray()
        })).toArray()
    }
    void saveBoard(newBoard)
})

document.addEventListener('DOMContentLoaded', () => {
    initializeBoard()
    autosaver.observe(document.getElementById('app'), {subtree: true, childList: true})
});

function initializeBoard() {
    const storedBoard = localStorage.getItem(boardKey)
    let parsedBoard = null
    try {
        parsedBoard = JSON.parse(storedBoard)
    } catch {
        console.error("could not parse stored board; resetting")
    }

    board = new Proxy(parsedBoard ?? defaultBoard, {
        set(target, p, newValue, receiver) {
            void saveBoard(receiver)
            return Reflect.set(target, p, newValue, receiver)
        }
    })

    const boardElement = document.querySelector('main')
    boardElement.setAttribute('data-id', board.id)
    document.querySelector('#board-name').innerText = board.name

    for (const column of board.columns) {
        boardElement.appendChild(renderColumn(column))
    }

}

async function saveBoard(board) {
    await localStorage.setItem(boardKey, JSON.stringify(board))
}

function renderColumn(column) {
    const template = document.getElementById('column-template')
    const fragment = template.content.cloneNode(true)
    fragment.querySelector('.column').setAttribute('data-id', column.id)
    fragment.querySelector('.column-name').innerText = column.name

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
            list.appendChild(dragging)
            serializeBoard()
        }
    })
    for (const card of column.cards) {
        cardList.appendChild(renderCard(card))
    }

    return fragment
}

function serializeBoard() {

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

