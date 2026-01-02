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

/** @returns {{min: number, max: number}}
 *  @param {Matrix} matrix 
 * */
function getMinMax(matrix, n) {
    let line = matrix.matrix[n];
    let minmax = { min: 0, max: 0 };
    for (let i = 0; i < line.length - 1; i++) {
        let coef = line[i]
        let value = matrix.points[i].value;
        if (coef == 1 && value != 0) {
            minmax.max++;
        }
        else if (coef == 1 && value == 1) {
            minmax.min++;
        }
        else if (coef == -1 && value == 1) {
            minmax.max--;
        }
        else if (coef == -1 && value != 0) {
            minmax.min--;
        }
    }
    return minmax;
}

/**
 *  @param {Matrix} matrix 
 * */
function getPointValues(matrix) {
    let n = 1;
    while (n > 0) {
        n = 0;
        for (let i = 0; i < matrix.matrix.length; i++) {
            let l = matrix.matrix[i];
            let minmax = getMinMax(matrix, i);
            if (l[l.length - 1] == minmax.min) {
                for (let j = 0; j < l.length - 1; j++) {
                    let point = matrix.points[j];
                    if (point.value != -1) continue;
                    if (l[j] == 1) {
                        point.value = 0;
                        n++;
                    }
                    else if (l[j] == -1) {
                        point.value = 1;
                        n++;
                    }
                }
            }
            else if (l[l.length - 1] == minmax.max) {
                for (let j = 0; j < l.length - 1; j++) {
                    let point = matrix.points[j];
                    if (point.value != -1) continue;
                    if (l[j] == 1) {
                        point.value = 1;
                        n++;
                    }
                    else if (l[j] == -1) {
                        point.value = 0;
                        n++;
                    }
                }
            }
        }
    }
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
    //console.log("forward pass");
    //for (let r of m) { console.log(r); }
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
    //console.log("backward pass");
    //for (let r of m) { console.log(r); }
}
