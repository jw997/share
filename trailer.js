const jscad = require('@jscad/modeling')

const {
  torus,
  cuboid,
  ellipse,
  star
} = require('@jscad/modeling').primitives
const {
  colorize,
  colorNameToRgb,
  hexToRgb
} = require('@jscad/modeling').colors
const {
  cylinder
} = jscad.primitives
const {
  subtract,
  union
} = jscad.booleans

const {
  extrudeFromSlices,
  slice
} = jscad.extrusions
const {
  translate,
  translateX,
  translateY,
  translateZ,
  mirrorZ,
  mirrorY,
  mirrorX,
  rotateZ,
  rotate,
  rotateX,
  rotateY
} = jscad.transforms

// material colors
let concrete = colorNameToRgb('lightblue')
let wood = colorNameToRgb('yellow')
let plywood = colorNameToRgb('brown')
let rockbody = colorNameToRgb('darkgrey')
let rockface = colorNameToRgb('lightgrey')
let foam = colorNameToRgb('blue')
let sheetmetal = colorNameToRgb('silver')

// elementwise diff of arrays to compute size for cuboid
function diff(a1, a2) {
  retval = []
  for (let i = 0; i < a1.length; i++) {
    retval[i] = Math.abs(a2[i] - a1[i])
  }
  return retval
}

// compute center for cuboid
function avg(a1, a2) {
  retval = []
  for (let i = 0; i < a1.length; i++) {
    retval[i] = (a2[i] + a1[i]) / 2
  }
  return retval
}

// make cuboids out of corner,corner, material data
// infer top face has 2nd corner, shortest dimension
// example [{from:[0,0,0], to:[157.5, 1.5 ,5.5], color:wood}]
function arrtoitems(a) {

  let items = []

  for (let i = 0; i < a.length; i++) {
    f = a[i].from;
    t = a[i].to;
    c = a[i].color;

    sz = diff(f, t);
    cent = avg(f, t);

    item = colorize(c, cuboid({
      size: sz,
      center: cent
    }))
    console.log(item)
    items.push(item)
  }

  return items
}

// shift init by xs[] to copy parallel members
function xinc(init, xs) {
  console.log(init)

  let retval = []

  for (let i = 0; i < xs.length; i++) {
    item = new Object()
    item.from = [...init.from]
    item.to = [...init.to]
    item.color = [...init.color]

    item.from[0] = init.from[0] + xs[i]
    item.to[0] = init.to[0] + xs[i]
    
    retval.push(item)
  }

  return retval
}
// draw big visibile axes on picture
function axes() {
  let long = 24
  let short = 2
  let xa = colorize([100, 0, 0], cuboid({
    size: [long, short, short],
    center: [long / 2, short / 2, short / 2]
  }))

  let ya = colorize([0, 100, 0, ], cuboid({
    size: [short, long, short],
    center: [short / 2, long / 2, short / 2]
  }))

  let za = colorize([0, 0, 100], cuboid({
    size: [short, short, long],
    center: [short / 2, short / 2, long / 2]
  }))

  return [xa, ya, za]
}

function floorframing() {
  // wood from list of coordinates 
  //  {from:, to:, color:wood},
  let arr = [{
      from: [0, 0, 0],
      to: [157.5, 1.5, 5.5],
      color: wood
    },
    // 
    {
      from: [0, 78, 0],
      to: [157.5, 79.5, 5.5],
      color: wood
    },

    // floor joists
    {
      from: [0, 1.5, 0],
      to: [1.5, 1.5 + 76.5, 5.5],
      color: wood
    },
  ]

  let j1 = {
    from: [0, 1.5, 0],
    to: [1.5, 1.5 + 76.5, 5.5],
    color: wood
  };
  // from plans
  let positions = [0, 16, 30.75, 32.25, 50, 66, 82, 98, 114, 130, 146,
    156
  ];

  // insulation blocks most are 14.5 inches wide
  let f1 = {
    from: [0, 1.5, 0],
    to: [14.5, 1.5 + 76.5, 5.5],
    color: foam
  };
  let foampos = [1.5, 51.5, 67.5, 83.5, 99.5, 115.5, 131.5]
  // 3 special bays
  // 17.5 to 30.75
  let f2 = {
    from: [17.5, 1.5, 0],
    to: [30.75, 1.5 + 76.5, 5.5],
    color: foam
  };
  // 33.75 to 50
  let f3 = {
    from: [33.75, 1.5, 0],
    to: [50, 1.5 + 76.5, 5.5],
    color: foam
  };
  // 147.5 to 156
  let f4 = {
    from: [147.5, 1.5, 0],
    to: [156, 1.5 + 76.5, 5.5],
    color: foam
  };

  arr = arr.concat(xinc(j1, positions));

  arr = arr.concat(xinc(f1, foampos));
  arr = arr.concat([f2, f3, f4])
  console.log ("floorframing", arr)
  return arrtoitems(arr)
}

function scale(scaleFactor, array) {
  retval = array.map((e) => e * scaleFactor)
  return retval;
}

function tires() {

  let HT = Math.PI / 2
  let IR = 3
  let OR = 7
  // OR -IR is the radius of the hole

  let overallradius = IR + OR

  let tire = translateZ(-10, rotateX(HT, colorize([0, 0, 0], torus({
    innerRadius: IR,
    outerRadius: OR
  }))))

  let backtire = translateX(-overallradius - 1, tire)
  let fronttire = mirrorX(backtire)

  //let tirelf = translateX(2*(OR+IR+1), tire)

  //let u = translateX(-OR-IR, union(tire,tirelf))
  let u = colorize([0, 0, 0], union(backtire, fronttire))
  return u

}

function drywall() {

  let half = 0.5
  let dims = [8 * 12, 4 * 12, 0.4]

  let body = colorize(rockbody, cuboid({
    size: dims,
    center: scale(half, dims)
  }))
  dims = [8 * 12, 4 * 12, 0.1]
  let face = translateZ(0.4, colorize(rockface, cuboid({
    size: dims,
    center: scale(half, dims)
  })))
  return [body, face]
}

function tongue() {
  let c = cuboid({
    size: [40, 4, 6],
    center: [-20, 0, 0]
  })
  let theta = Math.atan(3 / 4)
  let al = cuboid({
    size: [50, 4, 6],
    center: [-25, 0, 0]
  })
  al = rotateZ(-theta, al)
  let ar = cuboid({
    size: [50, 4, 6],
    center: [-25, 0, 0]
  })
  ar = rotateZ(theta, ar)

  let retval = colorize([0, 0, 0], union(c, al, ar))

  return retval

}

function trailer() {
  let A = 168 // length of rectangle box 14 feet

  let B = 158 // length insdie of box
  let C = 69 // dist from front of box to wheel well
  let D = 36 // length of wheel well
  let E = 63 // dist from back of well to end of box
  // A = C + D+ E
  let boxOuterWidth = 100
  let boxInnerWidth = 80

  let wellOuterWidth = 102
  let wellInnerWidth = 84

  let wellWidth = (wellOuterWidth - wellInnerWidth) / 2

  let boxHeight = 6
  let wellHeight = 8.5

  let wellXCenter = A / 2 - C - D / 2

  // well is 36 * 9 * 8.5

  // outer box (Ax100) - inner box(B*80) + wells
  let outerBox = cuboid({
    size: [A, boxOuterWidth, boxHeight]
  })

  let innerBox = cuboid({
    size: [B, boxInnerWidth, boxHeight]
  })

  let box = subtract(outerBox, innerBox)

  let well = cuboid({
    size: [D, wellWidth, wellHeight],
    center: [wellXCenter, (wellInnerWidth + wellWidth) / 2, (
      boxHeight + wellHeight) / 2]
  })

  // reflectY to make other well
  let well2 = mirrorY(well)

  let tyres = translateY((wellInnerWidth + wellWidth) / 2, translateX(
    wellXCenter, tires()))

  let righttires = mirrorY(tyres)

  // tongue

  let c = cuboid({
    size: [40, 4, 6],
    center: [-20, 0, 0]
  })
  let theta = Math.atan(3 / 4)
  let al = cuboid({
    size: [50, 4, 6],
    center: [-25, 0, 0]
  })
  al = rotateZ(-theta, al)
  let ar = cuboid({
    size: [50, 4, 6],
    center: [-25, 0, 0]
  })
  ar = rotateZ(theta, ar)

  let tongue = translateZ(-3 - boxHeight / 2, translateX(A / 2 + 40,
    colorize([0, 0, 0], union(c, al, ar))))

  // floor

  let floor = colorize(sheetmetal, translateZ(-boxHeight / 2, cuboid({
    size: [B, boxInnerWidth, 0.1],
    center: [0, 0, -boxHeight / 2]
  })))

  let blackparts = colorize([0, 0, 0], translateZ(-boxHeight / 2,
    union(box, well, well2, tyres, righttires)))

  // move trailer so origin is back inside lower corner of box
  let stuff = translate([B / 2, boxInnerWidth / 2, boxHeight], [
    blackparts, tongue, /*box,well,well2,tyres,righttires, */
    floor
  ])
  return stuff
}

function main() {
  let items = floorframing()

  return [trailer(), axes()].concat(items)
}

module.exports = {
  main
}
