"use strict"

let UI = undefined;

function init() {
    let main = document.createElement("div");
    main.id = "main"
    document.body.appendChild(main);
    let cvs = document.createElement("canvas");
    main.appendChild(cvs);
    
    UI = {
        w: document.createElement("input"), 
        h: document.createElement("input"), 
        p: document.createElement("input"),
        size: document.createElement("input"),
        s: document.createElement("input"),
        open: undefined,
        audioCtx: undefined,
        pop: undefined,
        audioBuffer: undefined,
        mute: false,
        grid: undefined};

    let dblClick = {value: false};
    cvs.oncontextmenu = () => {return false;}; 
    cvs.addEventListener("mousedown", (e) => {if(e.button == 2) {e.preventDefault();return false;}});
    cvs.addEventListener("mouseup", (e) => {onClick(e, cvs, false, UI)});
    cvs.addEventListener("dblclick", (e) => {onDoubleClick(e, cvs, true, UI)});

    createUI(cvs, UI, main);
}

function createUI(cvs, ui, main) {
    let ctx = cvs.getContext("2d");
    ctx.imageSmoothingEnabled = false;
    ctx.translate(0.5, 0.5);

    ui.w.type = "text";
    ui.w.name = "Width";
    ui.w.value = 40;
    let labelWidth = document.createElement("p");
    labelWidth.textContent = ui.w.name;
    main.appendChild(labelWidth);
    main.appendChild(ui.w);

    ui.h.type = "text";
    ui.h.name = "Height";
    ui.h.value = 20;
    let labelHeight = document.createElement("p");
    labelHeight.textContent = ui.h.name;
    main.appendChild(labelHeight);
    main.appendChild(ui.h);

    ui.p.type = "text";
    ui.p.name = "Probability";
    ui.p.value = 0.25;
    let labelProb = document.createElement("p");
    labelProb.textContent = ui.p.name;
    main.appendChild(labelProb);
    main.appendChild(ui.p);

    ui.size.type = "text";
    ui.size.name = "UI size";
    ui.size.value = 30;
    let labelSize = document.createElement("p");
    labelSize.textContent = ui.size.name;
    main.appendChild(labelSize);
    main.appendChild(ui.size);

    ui.s.type = "button";
    ui.s.value = "Start";
    ui.s.onclick = () => {
        if(!ui.audioCtx) {
            ui.audioCtx = new AudioContext();
            let temp = getAudioFile(ui.audioCtx, "pop.flac");
            temp.then(r => {
                ui.pop = r;
                for (let channel = 0; channel < ui.pop.numberOfChannels; channel += 1) {
                    const channelData = ui.pop.getChannelData(channel);

                    for (let sample = 0; sample < channelData.length; sample += 1) {
                        channelData[sample] *= 0.3;
                    }
                }
            });
        }
        ui.grid = makeGrid(+ui.w.value, +ui.h.value, +ui.size.value, 1, 3, 1, ui.p.value);
        ui.open = Array.from({length: +ui.h.value}, () => Array.from({length: +ui.w.value}, () => false));
        let size = calcSize(ui.grid);
        cvs.width = size.width;
        cvs.height = size.height;
        drawGrid(ctx, ui.grid);
        drawField(ctx, ui)
    };
    main.appendChild(ui.s);
}

function makeGrid(width, height, size, thickness, outerPadding, innerPadding, prob) {
    let result = {
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
    return result;
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
    let spots = Array.from({length: height}, () => Array.from({length: width}, () => makeSpot(false, "hidden")));
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

function drawSquare(ctx, grid, col, row, color) {
    ctx.fillStyle = color
    let pos = calcPixelPos(grid, col, row, 0, 0);
    let size = grid.size - 2*grid.innerPadding - 2*grid.outerPadding;
    ctx.fillRect(pos.x, pos.y, size, size);
}

function drawField(ctx, ui) {
    let grid = ui.grid;
    for(let col = 0; col < grid.width; col++) {
        for(let row = 0; row < grid.height; row++){
            let s = grid.field.spots[row][col];
            let open = ui.open[row][col];
            if(s.state == "hidden") {
                drawSquare(ctx, grid, col, row, "#aaa");
            } else if(s.state == "flagged") {
                drawSquare(ctx, grid, col, row, "#a00");
            } else if(s.state == "open" && open) {
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
    {prev: "hidden", next: "flagged", action: "none"},
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
    let s = field.spots[row][col];
    if(s.state == "hidden") {
        s.state = "open";
    }

    let mines = around(field, col, row, s => s.mine?1:0);
    let flags = around(field, col, row, s => s.state == "flagged"?1:0);

    if(mines == flags) {
        for(let i of [-1,0,1]) {
            for(let j of [-1,0,1]) {
                try {
                    if(field.spots[row+j][col+i].state == "hidden") {
                        expand(field, col+i, row+j);
                    }
                }catch(e){}
            }
        }
    }
}

function onClick(e, cvs, dblClick, ui) {
    let grid = ui.grid;
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
    if(e.button == 2 || (e.button == 0 && dblClick)) {
        if(grid.field.empty) {
            grid.field = randomiseField(grid.field, ui.grid.field.probability, col, row);
        }
        logic = rLogic;
        e.preventDefault();
    }
    let action = applyLogic(logic, spot);
    if(action == "expand") {
        if(!ui.open[row][col]) {
            ui.open[row][col] = true;
            pop(ui, 0.0);
        }
        expand(grid.field, col, row);
    }
    drawField(cvs.getContext("2d"), ui)
    cascade(cvs.getContext("2d"), ui, 0.0);
}

function cascade(ctx, ui, pitch) {
    let toOpen = [];
    for(let c = 0; c<ui.grid.field.width; c++) {
        for(let r = 0; r<ui.grid.field.height; r++) {
            if(!ui.open[r][c]) continue;
            for(let i = -1; i <= 1; i++) {
                for(let j = -1; j <= 1; j++) {
                    if(i == 0 && j == 0) continue;
                    try {
                        if(ui.grid.field.spots[r + i][c + j].state == "open" && !ui.open[r + i][c + j]) {
                            toOpen.push({x: c+j, y: r+i})
                        }
                    } catch (e) {}
                }
            }
        }
    }
    toOpen.forEach(e => ui.open[e.y][e.x] = true);
    if(toOpen.length > 0) pop(ui, 100*Math.pow(2,pitch));

    let dontMatch = false;
    for(let c = 0; c<ui.grid.field.width; c++) {
        if(dontMatch) break;
        for(let r = 0; r<ui.grid.field.height; r++) {
            if((ui.grid.field.spots[r][c].state == "open") && !ui.open[r][c]) {
                dontMatch = true;
                break;
            }
        }
    }

    drawField(ctx, ui);
    if(dontMatch) {
        setTimeout(() => cascade(ctx, ui, pitch+1), 50);
    }
}

function onDoubleClick(e, cvs, dblClick, ui) {
    onClick(e, cvs, dblClick, ui);
}

function randomiseField(field, density, col, row) {
    field.empty = false;
    for(let c = 0; c<field.width; c++) {
        for(let r = 0; r<field.height; r++) {
            if(c <= col+1 && c>= col-1 && r <= row+1 && r>= row-1) {
                continue;
            }
            field.spots[r][c].mine = Math.random() < density;
        }
    }
    expand(field, col, row);
    return field;
}

function makeSolvableField(field, p, col, row){
    let visited = Array.from({length: height}, (v, r) => Array.from({}, (v2, c) => (r<row-1||r>row+1)&&(c<col-1||c>col+1)));

    for(let i = 5; i<Math.max(field.width, field.height); i += 2) {
        let lowR = row - ((i-1)/2);
        let lowC = col - ((i-1)/2);
        let highR = row + ((i-1)/2);
        let highC = col + ((i-1)/2);
        for(let r = lowR; r<highR; r++){
            for(let c = lowC; c<highC; c++){
                if(!(r == lowR) || !(c == lowC) || !(r == highR) || !(c == highC)) continue;
                field.spots[r][c] = Math.random() < p;
            }
        }
        while(isnotsolvable) {
            //remove some mines
        }
    }
    field.empty = false;
    return field;
}

function isReachable(result, field) {
    
}
async function getAudioFile(audioContext, filepath) {
    const response = await fetch(filepath);
    const arrayBuffer = await response.arrayBuffer();
    const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
    return audioBuffer;
}

function pop(ui, pitch) {
    if(ui.mute) return;
    
    const pop = new AudioBufferSourceNode(ui.audioCtx, {
        buffer: ui.pop,
    });
    pop.connect(ui.audioCtx.destination);
    pop.detune.value = pitch;
    pop.start();
    return pop;
}
