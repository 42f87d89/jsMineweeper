"use strict"
function init() {
    let main = document.createElement("div");
    main.id = "main"
    document.body.appendChild(main);
    let cvs = document.createElement("canvas");
    main.appendChild(cvs);
    
    let UI = {
        w: document.createElement("input"), 
        h: document.createElement("input"), 
        p: document.createElement("input"),
        s: document.createElement("input"),
        grid: undefined};

    let dblClick = {value: false};
    cvs.oncontextmenu = () => {return false;}; 
    cvs.addEventListener("mousedown", (e) => {if(e.button == 2) {e.preventDefault();return false;}});
    cvs.addEventListener("mouseup", (e) => {window.setTimeout(() => {onClick(e, cvs, dblClick, UI)}, 150)});
    cvs.addEventListener("dblclick", (e) => {onDoubleClick(e, cvs, dblClick, UI)});

    UI.grid = makeGrid(20, 10, 50, 1, 10, 1, 0);
    createUI(cvs, UI, main);
}

function createUI(cvs, UI, main) {
    let ctx = cvs.getContext("2d");
    ctx.imageSmoothingEnabled = false;
    ctx.translate(0.5, 0.5);

    UI.w.type = "text";
    UI.w.name = "Width";
    let labelWidth = document.createElement("p");
    labelWidth.textContent = UI.w.name;
    main.appendChild(labelWidth);
    main.appendChild(UI.w);

    UI.h.type = "text";
    UI.h.name = "Height";
    let labelHeight = document.createElement("p");
    labelHeight.textContent = UI.h.name;
    main.appendChild(labelHeight);
    main.appendChild(UI.h);

    UI.p.type = "text";
    UI.p.name = "Probability";
    let labelProb = document.createElement("p");
    labelProb.textContent = UI.p.name;
    main.appendChild(labelProb);
    main.appendChild(UI.p);

    UI.s.type = "button";
    UI.s.value = "Start";
    UI.s.onclick = () => {
        console.log("hello");
        UI.grid = makeGrid(UI.w.value, UI.h.value, 50, 1, 10, 1, UI.p.value);
        let size = calcSize(UI.grid);
        cvs.width = size.width;
        cvs.height = size.height;
        drawGrid(ctx, UI.grid);
        drawField(ctx, UI.grid)
    };
    main.appendChild(UI.s);

    let size = calcSize(UI.grid);
    cvs.width = size.width;
    cvs.height = size.height;
    drawGrid(ctx, UI.grid);
    drawField(ctx, UI.grid)
}

function makeGrid(width, height, size, thickness, outerPadding, innerPadding, prob) {
    return {
        width: width,
        height: height,
        size: size,
        thickness: thickness,
        outerPadding: outerPadding,
        innerPadding: innerPadding,
        field: makeEmptyField(width, height, prob),
        part: Math.floor((size -
            thickness -
            2*outerPadding -
            2*innerPadding)/3)
    }
}

function calcSize(grid) {
    return {
        width: grid.width*grid.size + grid.thickness,
        height: grid.height*grid.size + grid.thickness
    }
}

function calcPixelPos(grid, col, row, partX, partY) {
    let colX = grid.size*col + grid.thickness + grid.outerPadding;
    let colY = grid.size*row + grid.thickness + grid.outerPadding;
    
    return {x: colX + partX*(grid.part+grid.innerPadding),
            y: colY + partY*(grid.part+grid.innerPadding)}
}

function drawGrid(ctx, grid) {
    let dim = calcSize(grid);
    for(let i = 0; i <= grid.width; i++) {
        ctx.fillRect(i*grid.size, 0, grid.thickness, dim.height);
    }
    for(let i = 0; i <= grid.height; i++) {
        ctx.fillRect(0, i*grid.size, dim.width, grid.thickness);
    }
}

let colors = ["#00f", "#900", "#e22", "#a09", "#0ac", "#0c0", "#e8c", "#333"];
//w and h refer to position on the grid
function drawNumber(ctx, grid, col, row, n) {
    let templates = ["    x    ", "x       x", "x   x   x", "x x   x x", "x x x x x", "x xx xx x", "x xxxxx x", "xxxx xxxx"]
    let parts = templates[n-1];
    ctx.fillStyle = colors[n-1];
    for(let i = 0; i < 9; i++) {
        if(parts[i] != " ") {
            let pos = calcPixelPos(grid, col, row, i%3, Math.floor(i/3));
            ctx.fillRect(pos.x, pos.y, grid.part, grid.part);
        }
    }
}

function makeSpot(mine, state) {
    return {mine: mine, state: state};
}

function makeEmptyField(width, height, prob) {
    let spots = new Array(width);
    for(let row = 0; row<height; row++) {
        spots[row] = new Array(height);
        for(let col = 0; col<width; col++) {
            spots[row][col] = makeSpot(false, "hidden");
        }
    }
    return {width: width, height:height, spots: spots, empty: true, probability: prob};
}

function around(field, col, row, f) {
    let result = 0;
    for(let i = -1; i <= 1; i++) {
        for(let j = -1; j <= 1; j++) {
            if(i == 0 && j == 0) continue;
            try {
                result += f(field.spots[row + i][col + j]);
            } catch (e) {}
        }
    }
    return result;
}

function drawField(ctx, grid) {
    function drawSquare(ctx, grid, col, row, color) {
        ctx.fillStyle = color
        let pos = calcPixelPos(grid, col, row, 0, 0);
        let size = grid.size - 2*grid.innerPadding - 2*grid.outerPadding;
        ctx.fillRect(pos.x, pos.y, size, size);
    }
    for(let col = 0; col < grid.width; col++) {
        for(let row = 0; row < grid.height; row++){
            let s = grid.field.spots[row][col]
            if(s.state == "hidden") {
                drawSquare(ctx, grid, col, row, "#aaa")
            } else if(s.state == "flagged") {
                drawSquare(ctx, grid, col, row, "#a00");
            } else if(s.state == "open") {
                if(s.mine) {
                    drawSquare(ctx, grid, col, row, "#000");
                } else {
                    drawSquare(ctx, grid, col, row, "#ddd");
                    let c = around(grid.field, col, row, (s) => {return s.mine?1:0});
                    if(c == 0) {
                    } else {
                        drawNumber(ctx, grid, col, row, c);
                    }
                }
            }
        }
    }
}

let rLogic = [
    {prev: "hidden", next: "open", action: "expand"},
    {prev: "open", next: "open", action: "expand"}];
let lLogic = [
    {prev: "hidden", next: "flagged", action: "expand"},
    {prev: "flagged", next: "hidden", action: "none"},
    {prev: "open", next: "open", action: "expand"}];

function applyLogic(logic, spot) {
    let action = "none";
    for(let i = 0; i<logic.length; i++) {
        let rule = logic[i];
        if(spot.state == rule.prev) {
            spot.state = rule.next;
            action = rule.action;
            break;
        }
    }
    return action;
}

function expand(field, col, row) {
    let spot = field.spots[row][col]
    if(spot.state == "hidden") spot.state = "open";
    let mines = around(field, col, row, (s) => {return s.mine?1:0;});
    let flags = around(field, col, row, (s) => {return s.state == "flagged"?1:0;});
    if(mines == flags) {
        for(let i = -1; i <= 1; i++) {
            for(let j = -1; j <= 1; j++) {
                if(i == 0 && j == 0) continue;
                try {
                    if(field.spots[row+j][col+i].state == "hidden") {
                        expand(field, col+i, row+j);
                    }
                } catch (e) {}
            }
        }
    }
}

function onClick(e, cvs, dblClick, UI) {
    let grid = UI.grid;
    let r = cvs.getBoundingClientRect();
    let x = e.clientX - r.x;
    let y = e.clientY - r.y;
    let col = Math.floor(x/grid.size);
    let row = Math.floor(y/grid.size);
    let spot = grid.field.spots[row][col]
    if(
        x%grid.size < calcPixelPos(grid, col, row, 0, 0) ||
        x%grid.size > calcPixelPos(grid, col, row, 3, 3) + grid.part) {
        return; 
    }
    let logic = lLogic;
    if(e.button == 2 || (e.button == 0 && dblClick.value)) {
        if(grid.field.empty) {
            grid.field = randomiseField(grid.field, UI.grid.field.probability, col, row);
        }
        logic = rLogic;
        e.preventDefault();
    }
    if(!grid.field.empty){
        let action = applyLogic(logic, spot);
        if(action == "expand") {
            expand(grid.field, col, row);
        }
    }
    drawField(cvs.getContext("2d"), grid)
}

function onDoubleClick(e, cvs, dblClick, UI) {
    dblClick.value = true;
    onClick(e, cvs, dblClick, UI);
    dblClick.value = false;
}

function randomiseField(field, density, col, row) {
    field.empty = false;
    for(let c = 0; c<field.width; c++) {
        for(let r = 0; r<field.height; r++) {
            if(c <= col+1 && c>= col-1 && r <= row+1 && r>= row-1) continue;
            field.spots[r][c].mine = Math.random()<density;
        }
    }
    return field;
}
