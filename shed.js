const jscad = require('@jscad/modeling')

const {
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
  mirrorX
} = jscad.transforms

// material colors
let concrete = colorNameToRgb('lightblue')
let wood = colorNameToRgb('yellow')
let plywood = colorNameToRgb('brown')

function foundationside() {
  return (
    colorize(concrete,

      translate([0, 0, -24], cuboid({
        size: [178, 6, 24],
        center: [178 / 2, 6 / 2, 24 / 2]
      })),
      translate([0, -6, -24], cuboid({
        size: [178, 18, 6],
        center: [178 / 2, 18 / 2, 6 / 2]
      }))
    )
  )
}

function foundation() {
  return foundationside().concat(
    translateY(143 + 6, mirrorY(foundationside())))
}

// return array of obj
function copyN(obj, N, translateVec) {
  var cubes = [];
  var last = obj;
  //var retval=[]

  for (i = 0; i < N; i++) {
    cubes[i] = last
    last = translate(translateVec, last);

  }
  console.log(cubes)
  return cubes

}

function wallhalf() {
  var retval = []

  /*
          walls
          */

  let soleplate = cuboid({
    size: [178, 4, 2],
    center: [178 / 2, 4 / 2, 2 / 2]
  })

  soleplate.color = wood
  let stud = cuboid({
    size: [2, 4, 84],
    center: [2 / 2, 4 / 2, 84 / 2]
  })
  stud.color = wood

  let studs =
    copyN(stud, 12, [16, 0, 0])

  /*
         sheathing
         */
  let sheathing = cuboid({
    size: [178, 1, 84],
    center: [178 / 2, -1 / 2, 84 / 2]
  })
  sheathing.color = plywood

  /*
  top plate
  */
  let topplate = cuboid({
    size: [178, 4, 2],
    center: [178 / 2, 4 / 2, 84 + 2 / 2]
  })
  topplate.color = wood
  // .translate([0, 0, 84]).setColor(css2rgb('red'))

  retval = [soleplate, topplate, sheathing]
  retval.push(studs)

  return retval

}

function wall() {

  let w1 = wallhalf()

  let w2 = translateY(143 + 6, mirrorY(w1))

  return w1.concat(w2)

}

function shed() {

  /*
  foundation
  */
  let f = foundation()

  /*
       floor
       */
  let floor = cuboid({
    size: [178, 148, 1],
    center: [178 / 2, 148 / 2, -1 / 2]
  })
  floor.color = plywood
  /*
       walls
       */

  let w = wall()

  /*
  ridge beam
  */

  let ridge = cuboid({
    size: [178, 4, 6],
    center: [178 / 2, 72 + 4 / 2, 108 + 6 / 2]
  })
  ridge.color = wood
  //.translate([0, 72, 108]).setColor(css2rgb('green'))

  /*
        posts
        */
  let posts = [
    cuboid({
      size: [4, 4, 108],
      center: [4 / 2, 4 / 2 + 72, 108 / 2]
    })
    //.translate([0, 72, 0]).setColor(css2rgb('yellow'))

    ,

    cuboid({
      size: [4, 4, 108],
      center: [4 / 2 + 174, 4 / 2 + 72, 108 / 2]
    })
    //.translate([174, 72, 0]).setColor(css2rgb('yellow'))

  ]
  posts = colorize(wood, posts)

  let retval = [f, floor, ridge].concat(posts).concat(w)

  return retval

}

function main() {
  return shed()
}

module.exports = {
  main
}
