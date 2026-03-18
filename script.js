let UNDO_STACK = []
let REDO_STACK = []
const MAX_UNDO = 50
let EDIT_MODE = true
let NODE_DATA = null
const GRID = 25
const toggle = document.getElementById("themeToggle")
const warning = document.getElementById("warning")
const warningButton = document.getElementById("warningButton")
const root = document.documentElement
const savedTheme = localStorage.getItem("theme")
if (savedTheme === "dark") {
    root.classList.add("dark")
    toggle.checked = true
}
toggle.addEventListener("change", () => {
    if (toggle.checked) {
        root.classList.add("dark")
        localStorage.setItem("theme", "dark")
    } else {
        root.classList.remove("dark")
        localStorage.setItem("theme", "light")
    }
})
if (localStorage.getItem("warned")) {
    warning.style.display = "none"
}
warningButton.addEventListener("click", () => {
    localStorage.setItem("warned", true)
    warning.style.display = "none"
})
let LANG = "EN"
const FR = 0
const TYPE = 1
const URL = 2
const X = 3
const Y = 4
const IN = 5
const chart = document.getElementById("chart")
const arrows = document.getElementById("arrows")
fetch("./nodes.json")
    .then(r => r.json())
    .then(data => {
        NODE_DATA = data
        render()
    })
function toggleLanguage() {
    LANG = LANG === "EN" ? "FR" : "EN"
    document.querySelectorAll(".en").forEach(e => e.style.display = LANG === "EN" ? "" : "none")
    document.querySelectorAll(".fr").forEach(e => e.style.display = LANG === "FR" ? "" : "none")
    render()
}
document.addEventListener("mousedown", e => {
    const menu = document.getElementById("nodeEditor")
    if (!menu) return
    if (menu.contains(e.target)) return
    menu.remove()
})
function openNodeEditor(key, x, y) {
    const menu = document.createElement("div")
    menu.id = "nodeEditor"
    menu.style.left = x + "px"
    menu.style.top = y + "px"
    const title = document.createElement("div")
    title.style.userSelect = "text"
    title.textContent = key
    title.style.fontSize = "16px"
    title.style.marginBottom = "4px"
    menu.appendChild(title)
    const frInput = document.createElement("input")
    frInput.placeholder = "French name"
    frInput.value = NODE_DATA[key][FR] || ""
    menu.appendChild(frInput)
    const typeInput = document.createElement("input")
    typeInput.placeholder = "Type"
    typeInput.value = NODE_DATA[key][TYPE] || ""
    menu.appendChild(typeInput)
    const linkInput = document.createElement("input")
    linkInput.placeholder = "Link"
    linkInput.value = NODE_DATA[key][URL] || ""
    menu.appendChild(linkInput)
    const precursorsContainer = document.createElement("div")
    precursorsContainer.style.display = "flex"
    precursorsContainer.style.flexDirection = "column"
    precursorsContainer.style.gap = "4px"
    menu.appendChild(precursorsContainer)
    function addPrecursorInput(value = "") {
        const input = document.createElement("input")
        input.placeholder = "Precursor node"
        input.value = value
        input.oninput = () => {
            const inputs = [...precursorsContainer.querySelectorAll("input")]
            if (inputs[inputs.length - 1] === input && input.value.trim() !== "")
                addPrecursorInput()
        }
        precursorsContainer.appendChild(input)
    }
    const existingPrecursors = NODE_DATA[key][IN] || []
    existingPrecursors.forEach(p => {
        if (p.length > 1) {
            const txt = Array.isArray(p[1]) ? p[1][0] + "|" + p[1][1] : p[1]
            addPrecursorInput(p[0] + "(" + txt + ")")
        } else addPrecursorInput(p[0])
    })
    addPrecursorInput()
    function save() {
        const newFR = frInput.value.trim()
        const newType = typeInput.value.trim()
        if (newType === "") {
            delete NODE_DATA[key]
            menu.remove()
            render()
            return
        }
        NODE_DATA[key][FR] = newFR || key
        NODE_DATA[key][TYPE] = newType
        NODE_DATA[key][URL] = linkInput.value.trim()
        const inputs = [...precursorsContainer.querySelectorAll("input")]
        const newPrecursors = []
        inputs.forEach(i => {
            const val = i.value.trim()
            if (val === "") return
            const match = val.match(/^(.+?)\((.+)\)$/)
            if (match) {
                const parts = match[2].split("|").map(s => s.trim())
                if (parts.length === 2) newPrecursors.push([match[1].trim(), [parts[0], parts[1]]])
                else newPrecursors.push([match[1].trim(), parts[0]])
            }
            else newPrecursors.push([val])
        })
        if (newPrecursors.length > 0) NODE_DATA[key][IN] = newPrecursors
        else delete NODE_DATA[key][IN]
        menu.remove()
        render()
    }
    const buttons = document.createElement("div")
    buttons.className = "buttons"
    const cancelBtn = document.createElement("button")
    cancelBtn.textContent = "Cancel"
    cancelBtn.onclick = () => menu.remove()
    const saveBtn = document.createElement("button")
    saveBtn.textContent = "Save"
    saveBtn.onclick = save
    buttons.appendChild(cancelBtn)
    buttons.appendChild(saveBtn)
    menu.appendChild(buttons)
    menu.addEventListener("keydown", e => {
        if (e.key === "Enter") {
            e.preventDefault()
            save()
        }
    })
    document.body.appendChild(menu)
    typeInput.focus()
}
document.addEventListener("contextmenu", e => {
    if (!EDIT_MODE) return
    const existing = document.getElementById("nodeEditor")
    if (existing) existing.remove()
    e.preventDefault()
    const nodeEl = e.target.closest(".node")
    const zoom = document.getElementById("zoomZone")
    const rect = zoom.getBoundingClientRect()
    const rawX = e.clientX - rect.left
    const rawY = e.clientY - rect.top
    const snappedX = Math.round(rawX / GRID) * GRID
    const snappedY = Math.round(rawY / GRID) * GRID
    if (nodeEl) {
        const key = nodeEl.dataset.key
        openNodeEditor(key, e.pageX, e.pageY)
        return
    }
    const title = prompt("Create new node with name:")
    if (!title || NODE_DATA[title]) return
    pushUndoState()
    REDO_STACK.length = 0
    NODE_DATA[title] = [title, "ni", "", snappedX, snappedY]
    render()
})
function pushUndoState() {
    UNDO_STACK.push(JSON.parse(JSON.stringify(NODE_DATA)))
    if (UNDO_STACK.length > MAX_UNDO) UNDO_STACK.shift()
}
function render() {
    chart.innerHTML = ""
    arrows.innerHTML = ""
    renderNodes(NODE_DATA)
    renderArrows(NODE_DATA)
    if (EDIT_MODE) enableDragging()
}
function toggleEditMode() {
    EDIT_MODE = !EDIT_MODE
    document.body.classList.toggle("editing", EDIT_MODE)
    render()
}
function undo() {
    if (!UNDO_STACK.length) return
    REDO_STACK.push(JSON.parse(JSON.stringify(NODE_DATA)))
    NODE_DATA = UNDO_STACK.pop()
    render()
}
function redo() {
    if (!REDO_STACK.length) return
    UNDO_STACK.push(JSON.parse(JSON.stringify(NODE_DATA)))
    NODE_DATA = REDO_STACK.pop()
    render()
}
document.addEventListener("keydown", e => {
    if (!EDIT_MODE) return
    if ((e.ctrlKey || e.metaKey) && e.key === "z") {
        e.preventDefault()
        undo()
    }
    if ((e.ctrlKey || e.metaKey) && e.key === "y") {
        e.preventDefault()
        redo()
    }
})
document.addEventListener("click", e => {
    if (!EDIT_MODE) return
    const node = e.target.closest(".node")
    if (!node) return
    e.preventDefault()
    e.stopPropagation()
})
function enableDragging() {
    document.querySelectorAll(".node").forEach(el => {
        let key
        el.onmousedown = e => {
            if (!EDIT_MODE || e.button !== 0) return
            e.preventDefault()
            key = el.dataset.key
            pushUndoState()
            REDO_STACK.length = 0
            document.onmousemove = ev => {
                const zoom = document.getElementById("zoomZone")
                const rect = zoom.getBoundingClientRect()
                const rawX = ev.clientX - rect.left
                const rawY = ev.clientY - rect.top
                const snappedX = Math.round(rawX / GRID) * GRID
                const snappedY = Math.round(rawY / GRID) * GRID
                NODE_DATA[key][X] = snappedX
                NODE_DATA[key][Y] = snappedY
                el.style.left = snappedX + "px"
                el.style.top = snappedY + "px"
                arrows.innerHTML = ""
                renderArrows(NODE_DATA)
            }
            document.onmouseup = () => {
                document.onmousemove = null
                document.onmouseup = null
                render()
            }
        }
    })
}
function copyUpdatedJSON() {
    const sorted = Object.fromEntries(
        Object.keys(NODE_DATA)
            .sort((a, b) => a.localeCompare(b)).map(key => {
                const node = NODE_DATA[key]
                let relations = Array.isArray(node[IN]) ? node[IN] : []
                relations = relations
                    .map(r => {
                        if (typeof r[0] === "string") {
                            const match = r[0].match(/^(.+?)\((.+)\)$/)
                            if (match) return [match[1].trim(), match[2].trim()]
                        }
                        return r
                    }).filter(r => NODE_DATA[r[0]])
                const seen = new Set()
                relations = relations.filter(r => {
                    const id = r[0] + "|" + (r[1] || "")
                    if (seen.has(id)) return false
                    seen.add(id)
                    return true
                })
                relations.sort((a, b) => a[0].localeCompare(b[0]))
                const base = [node[FR], node[TYPE], node[URL], node[X], node[Y]]
                return relations.length ? [key, [...base, relations]] : [key, base]
            })
    )
    navigator.clipboard.writeText(JSON.stringify(sorted, null, 4))
}
function renderNodes(data) {
    Object.entries(data).forEach(([name, node]) => {
        const type = node[TYPE]
        const types = []
        const shape = document.createElement("a")
        shape.draggable = false
        shape.classList.add("node__shape")
        switch (type[0]) {
            case "l": shape.classList.add("node__shape--left"); types.push("Leftist"); break
            case "g": shape.classList.add("node__shape--centerLeft"); types.push("Center-Leftist"); break
            case "c": shape.classList.add("node__shape--center"); types.push("Centrist"); break
            case "d": shape.classList.add("node__shape--centerRight"); types.push("Center-Rightist"); break
            case "r": shape.classList.add("node__shape--right"); types.push("Rightist"); break
            case "n": shape.classList.add("node__shape--grey"); types.push("Non/Multi-Sided"); break
        }
        switch (type[1]) {
            case "i": shape.classList.add("node__shape--ideology"); types.push("Ideology"); break
            case "f": shape.classList.add("node__shape--faction"); types.push("Faction/Party"); break
            case "c": shape.classList.add("node__shape--current"); types.push("Current Faction/Party"); break
        }
        const precursors = NODE_DATA[name][IN] || []
        const precursorsText = precursors.length
            ? "\n\n" + (LANG === "FR" ? "Provient de :" : "Comes from:") + "\n" + precursors.map(p => {
                const nodeName = LANG === "FR" ? (NODE_DATA[p[0]]?.[FR] || p[0]) : p[0]
                if (p.length > 1) {
                    const txt = Array.isArray(p[1]) ? (LANG === "FR" ? p[1][1] || p[1][0] : p[1][0]) : p[1]
                    return `${nodeName} (${txt})`
                }
                return nodeName
            }).join("\n")
            : ""
        const displayName = LANG === "FR" ? (node[FR] || name) : name
        title = `${displayName}\n${types[0]} ${types[1]}${precursorsText}`
        const container = document.createElement("a")
        container.className = "node"
        container.dataset.key = name
        container.style.left = node[X] + "px"
        container.style.top = node[Y] + "px"
        container.title = title
        const text = document.createElement("a")
        text.className = "node__text"
        text.textContent = LANG === "FR" ? (node[FR] || name) : name
        text.title = title
        text.draggable = false
        if (node[URL]) {
            text.href = node[URL]
            text.target = "_blank"
            shape.href = node[URL]
            shape.target = "_blank"
        } if (name.length > 18) {
            text.style.width = name.length > 36 ? "108px" : "92px"
        }
        container.appendChild(text)
        container.appendChild(shape)
        chart.appendChild(container)
    })
}
const PARTY_ARROW_CLASS = {
    l: "arrow--left",
    g: "arrow--centerLeft",
    c: "arrow--center",
    d: "arrow--centerRight",
    r: "arrow--right",
    n: "arrow--grey"
}
const PARTY_ARROWHEAD_CLASS = {
    l: "arrowhead--left",
    g: "arrowhead--centerLeft",
    c: "arrowhead--center",
    d: "arrowhead--centerRight",
    r: "arrowhead--right",
    n: "arrowhead--grey"
}
function pushPointForward(x1, y1, x2, y2, px) {
    const dx = x2 - x1
    const dy = y2 - y1
    const len = Math.hypot(dx, dy) || 1
    return {
        x: x2 + (dx / len) * px,
        y: y2 + (dy / len) * px
    }
}
function defineArrowMarker(svg, partyKey = "n") {
    const defs = svg.querySelector("defs") ||
        svg.appendChild(document.createElementNS("http://www.w3.org/2000/svg", "defs"))
    const id = `arrowhead-${partyKey}`
    if (svg.querySelector(`#${id}`)) return
    const marker = document.createElementNS("http://www.w3.org/2000/svg", "marker")
    marker.setAttribute("id", id)
    marker.setAttribute("markerWidth", "22")
    marker.setAttribute("markerHeight", "12")
    marker.setAttribute("refX", "22")
    marker.setAttribute("refY", "6")
    marker.setAttribute("orient", "auto")
    marker.setAttribute("markerUnits", "userSpaceOnUse")
    marker.setAttribute("overflow", "visible")
    const path = document.createElementNS("http://www.w3.org/2000/svg", "path")
    path.setAttribute("d", "M0,1 L22,6 L0,11 Z")
    path.classList.add(
        "arrowhead",
        PARTY_ARROWHEAD_CLASS[partyKey] || "arrowhead--grey"
    )
    marker.appendChild(path)
    defs.appendChild(marker)
}
function intersectSquare(x1, y1, x2, y2, half) {
    const dx = x2 - x1
    const dy = y2 - y1
    const adx = Math.abs(dx)
    const ady = Math.abs(dy)
    const t = adx > ady
        ? half / adx
        : half / ady
    return {
        x: x2 - dx * t,
        y: y2 - dy * t
    }
}
function intersectCircle(x1, y1, x2, y2, radius) {
    const dx = x2 - x1
    const dy = y2 - y1
    const len = Math.hypot(dx, dy) || 1
    return {
        x: x2 - (dx / len) * radius,
        y: y2 - (dy / len) * radius
    }
}
function intersectDiamond(x1, y1, x2, y2, half) {
    const dx = x2 - x1
    const dy = y2 - y1
    const adx = Math.abs(dx)
    const ady = Math.abs(dy)
    const denom = adx + ady || 1
    const t = half / denom
    return {
        x: x2 - dx * t,
        y: y2 - dy * t
    }
}
function buildPath(points) {
    return points
        .map((p, i) => `${i === 0 ? "M" : "L"}${p.x},${p.y}`)
        .join(" ")
}
function renderArrows(data) {
    const rect = chart.getBoundingClientRect()
    arrows.setAttribute("width", rect.width)
    arrows.setAttribute("height", rect.height)
    defineArrowMarker(arrows)
    Object.entries(data).forEach(([_, node]) => {
        const type = node[TYPE]
        const shapeType = type[1]
        const partyKey = type[0]
        const partyClass = PARTY_ARROW_CLASS[partyKey] || "arrow--grey"
        const incoming = node[IN]
        if (!incoming) return
        defineArrowMarker(arrows, partyKey)
        incoming.forEach(([fromName, label, bends]) => {
            const from = data[fromName]
            if (!from) return
            const x1 = from[X]
            const y1 = from[Y]
            const x2 = node[X]
            const y2 = node[Y]
            const points = [{ x: x1, y: y1 }]
            if (Array.isArray(bends)) {
                for (let i = 0; i < bends.length; i += 2) {
                    points.push({ x: bends[i], y: bends[i + 1] })
                }
            }
            const approach = points[points.length - 1]
            let end
            if (shapeType === "i") {
                end = intersectCircle(approach.x, approach.y, x2, y2, 9)
                end = pushPointForward(x2, y2, end.x, end.y, 12)
            } else if (shapeType === "f") {
                end = intersectSquare(approach.x, approach.y, x2, y2, 9)
                end = pushPointForward(x2, y2, end.x, end.y, 12)
            } else {
                end = intersectDiamond(approach.x, approach.y, x2, y2, 9)
                end = pushPointForward(x2, y2, end.x, end.y, 12)
            }
            points.push(end)
            const path = document.createElementNS("http://www.w3.org/2000/svg", "path")
            path.setAttribute("d", buildPath(points))
            path.setAttribute("fill", "none")
            path.setAttribute("marker-end", `url(#arrowhead-${partyKey})`)
            path.classList.add("arrow", partyClass)
            arrows.appendChild(path)
            if (label) {
                const midX = (x1 + x2) / 2
                const midY = (y1 + y2) / 2
                const fo = document.createElementNS("http://www.w3.org/2000/svg", "foreignObject")
                fo.setAttribute("x", midX - 20)
                fo.setAttribute("y", midY - 32)
                fo.setAttribute("width", 40)
                fo.setAttribute("height", 64)
                fo.style.overflow = "visible"
                const div = document.createElement("div")
                div.className = "arrow__text"
                const txt = Array.isArray(label) ? (LANG === "FR" ? label[1] || label[0] : label[0]) : label
                div.textContent = txt
                fo.appendChild(div)
                arrows.appendChild(fo)
            }
        })
    })
}
function generateTimeline() {
    timeline = document.getElementById("timeline")
    for (i = 1850; i <= 2025; i += 5) {
        timelineSection = document.createElement("div")
        timelineSection.textContent = i
        timeline.appendChild(timelineSection)
    }
}
const slider = document.getElementById("zoomSlider")
const zoomZone = document.getElementById("zoomZone")
const html = document.getElementById("html")
slider.min = 50
slider.max = 200
slider.value = 100
function applyZoom(value) {
    zoomZone.style.zoom = value + "%"
}
slider.addEventListener("input", () => {
    let raw = Number(slider.value)
    if (raw > 100) {
        raw = Math.round(raw / 10) * 10
    } else if (raw < 100) {
        raw = Math.round(raw / 5) * 5
    }
    slider.value = raw
    applyZoom(raw)
})
applyZoom(100)
html.style.minWidth = "100%"
html.style.maxWidth = "fit-content"
generateTimeline()
document.querySelectorAll(".fr").forEach(e => e.style.display = "none")