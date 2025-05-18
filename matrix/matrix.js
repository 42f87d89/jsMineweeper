let test = [
    [1, 3, 1, 9],
    [1, 1, -1, 1],
    [3, 11, 5, 35],
];

/** @returns {number[][]}
 *  @param {number} n 
 * */
function makeRandomMatrix(n) {
    let a = Array.from({ length: n }, () => Array.from({ length: n }, () => +(Math.random() > 0.5)));
    a[0][0] = 1;
    return a;
}

/** @returns {number[]}
 *  @param {number[]} v1 
 *  @param {number[]} v2 
 * */
function add(v1, v2) {
    result = [];
    for (let i = 0; i < v1.length; i++) {
        result[i] = v2[i] + v1[i];
    }
    return result;
}

/** @returns {number[]}
 *  @param {number[]} v1 
 *  @param {number[]} v2 
 * */
function sub(v1, v2) {
    let result = [];
    for (let i = 0; i < v1.length; i++) {
        result[i] = v2[i] - v1[i];
    }
    return result;
}

/** @returns {number[]}
 *  @param {number} a
 *  @param {number[]} v 
 * */
function mul(a, v) {
    let result = [];
    for (let i = 0; i < v.length; i++) {
        result[i] = a * v[i];
    }
    return result;
}

/**
 *  @param {number[][]} m 
 * */
function sort(m) {
    m.sort((a, b) => {
        let ai = a.findIndex((x) => { return x != 0 });
        if (ai == -1) ai = m.length;
        let bi = b.findIndex((x) => { return x != 0 });
        if (bi == -1) bi = m.length;

        return ai - bi;
    });
}

/**
 *  @param {number[][]} m 
 * */
function rowReduce(m) {
    for (let i = 0; i < m.length; i++) {
        let hi = m[i].findIndex((x) => { return Math.abs(x) > 1.0e-10 });
        if (hi == -1) {
            continue;
        }
        let head = m[i][hi];
        if (head != 1) {
            m[i] = mul(1 / head, m[i]);
        }
        for (let j = i + 1; j < m.length; j++) {
            let below = m[j][hi];
            if (below == 0) { continue; }
            m[j] = sub(mul(below, m[i]), m[j]);
        }
        sort(m);
    }
    console.log("forward pass");
    for (let r of m) { console.log(r); }
    for (let i = m.length - 1; i >= 0; i--) {
        let hi = m[i].findIndex((x) => { return x != 0 });
        if (hi == -1) {
            continue;
        }
        for (let j = i - 1; j >= 0; j--) {
            let above = m[j][hi];
            if (above == 0) continue;
            m[j] = sub(mul(above, m[i]), m[j]);
        }
    }
    console.log("backward pass");
    for (let r of m) { console.log(r); }
}
