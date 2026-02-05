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
    console.log("Bruh")
    localStorage.setItem("warned", true)
    warning.style.display = "none"
})
const TYPE = 0
const URL = 1
const X = 2
const Y = 3
const IN = 4
const chart = document.getElementById("chart")
const arrows = document.getElementById("arrows")
fetch("./nodes.json")
    .then(r => r.json())
    .then(data => {
        renderNodes(data)
        renderArrows(data)
    })
function renderNodes(data) {
    Object.entries(data).forEach(([name, node]) => {
        const type = node[TYPE]
        const types = []
        const isPortrait = type[1] === "p"
        const shape = document.createElement("a")
        shape.classList.add(isPortrait ? "portrait__shape" : "node__shape")
        switch (type[0]) {
            case "l": shape.classList.add(isPortrait ? "portrait__shape--left" : "node__shape--left"); types.push("Leftist"); break
            case "g": shape.classList.add(isPortrait ? "portrait__shape--centerLeft" : "node__shape--centerLeft"); types.push("Center-Leftist"); break
            case "c": shape.classList.add(isPortrait ? "portrait__shape--center" : "node__shape--center"); types.push("Centrist"); break
            case "d": shape.classList.add(isPortrait ? "portrait__shape--centerRight" : "node__shape--centerRight"); types.push("Center-Rightist"); break
            case "r": shape.classList.add(isPortrait ? "portrait__shape--right" : "node__shape--right"); types.push("Rightist"); break
            case "n": shape.classList.add(isPortrait ? "portrait__shape--grey" : "node__shape--grey"); types.push("Non/Multi-Sided"); break
        }
        if (!isPortrait) {
            switch (type[1]) {
                case "i": shape.classList.add("node__shape--ideology"); types.push("Ideology"); break
                case "f": shape.classList.add("node__shape--faction"); types.push("Faction/Party"); break
                case "c": shape.classList.add("node__shape--current"); types.push("Current Faction/Party"); break
            }
        } else {
            types.push("Figure")
        }
        title = `${name}\n\n${types[0]} ${types[1]}`
        const container = document.createElement("a")
        container.className = "node"
        container.style.left = node[X] + "px"
        container.style.top = node[Y] + "px"
        container.title = title
        const text = document.createElement("a")
        text.className = isPortrait ? "portrait__text" : "node__text"
        text.textContent = name
        text.title = title
        if (node[URL]) {
            text.href = node[URL]
            text.target = "_blank"
            shape.href = node[URL]
            shape.target = "_blank"
        }
        if (isPortrait) {
            shape.style.backgroundImage =
                `url("./assets/portraits/${encodeURIComponent(name)}.jpg")`
        } else if (name.length > 18) {
            text.style.width = name.length > 36 ? "128px" : "112px"
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
    marker.setAttribute("markerWidth", "21")
    marker.setAttribute("markerHeight", "12")
    marker.setAttribute("refX", "21")
    marker.setAttribute("refY", "6")
    marker.setAttribute("orient", "auto")
    marker.setAttribute("markerUnits", "userSpaceOnUse")
    marker.setAttribute("overflow", "visible")
    const path = document.createElementNS("http://www.w3.org/2000/svg", "path")
    path.setAttribute("d", "M0,1.5 L21,6 L0,10.5 Z")
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
function intersectRect(x1, y1, x2, y2, halfW, halfH) {
    const dx = x2 - x1
    const dy = y2 - y1
    const tx = dx !== 0 ? halfW / Math.abs(dx) : Infinity
    const ty = dy !== 0 ? halfH / Math.abs(dy) : Infinity
    const t = Math.min(tx, ty)
    return {
        x: x2 - dx * t,
        y: y2 - dy * t
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
            if (shapeType === "p") {
                end = intersectRect(approach.x, approach.y, x2, y2, 32, 40)
                end = pushPointForward(approach.x, approach.y, end.x, end.y, 4)
            } else if (shapeType === "i") {
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
                fo.setAttribute("x", midX - 44)
                fo.setAttribute("y", midY - 64)
                fo.setAttribute("width", 88)
                fo.setAttribute("height", 128)
                const div = document.createElement("div")
                div.className = "arrow__text"
                div.textContent = label
                fo.appendChild(div)
                arrows.appendChild(fo)
            }
        })
    })
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