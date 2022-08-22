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
  mirrorX,
  rotateZ
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

function foundation(params) {
  let found = foundationside().concat(
    translateY(143 + 6, mirrorY(foundationside())))
  found = translateZ(-7.25, found)
  return found

}

function twoby8(len,vert) {
   // makes a vert or horiz 2x8  at origin
   
   if (vert)
      block =  colorize(wood,cuboid({size:[1.5,7.25,len]}))
   else 
      block =  colorize(wood,cuboid({size:[len,1.5,7.25]}))
   return colorize(wood, block)
}

function subfloor(params) {
  bandjoist = translateX(178/2,translateZ(-4.75,twoby8(178)))
  bandjoist2 = translateY(148,bandjoist)
  
  joist = translateY(148/2,
          translateZ(-4.75,
          rotateZ(Math.PI/2,twoby8(148))))
          
  // copy joists 
  
  otherjoists = copyN(joist,12,[16,0,0])
  return [bandjoist,bandjoist2,joist].concat(otherjoists)
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

function wallhalf(params) {
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

  retval = [soleplate, topplate]
  retval.push(studs)
  
  if (params.plywood) {
    retval.push(sheathing)
  }

  return retval

}

function wall(params) {

  let w1 = wallhalf(params)

  let w2 = translateY(143 + 6, mirrorY(w1))

  return w1.concat(w2)

}

function shed(params) {

  /*
  foundation
  */
  let f = foundation(params)

  /* subfloor */
  let sf = subfloor(params)
  

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

  let w = wall(params)

  /*
  ridge beam
  */

  let ridge = cuboid({
    size: [178, 4, 6],
    center: [178 / 2, 72 + 4 / 2, 108 + 6 / 2]
  })
  ridge.color = wood
  console.log("ridge")
  console.log(ridge)
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
  
 // let retval = [f, floor, ridge].concat(posts).concat(w)
  let retval=[]
  
  if (params.roof)
    retval=[ridge].concat(posts)
  
  if (params.floor && params.plywood) {
    retval.push(floor)
  }
  
  if (params.foundation) {
    retval = retval.concat(f)
  }
  
  retval = retval.concat(sf)
      
  if (params.walls) {
    console.log("adding walls")
    retval = retval.concat(w)
  }
  
  
     
  return retval

}

const getParameterDefinitions = () => {
  // UG... only integer steps can be performed reliably
  console.log("Called getParamDef")

  return [
   { name: 'Parts', type: 'group', caption: 'Parts' },
  { name: 'foundation', type: 'checkbox', checked: true,  caption: 'foundation:' },
 
  { name: 'floor',      type: 'checkbox', checked: true,  caption: 'floor:' },

   { name: 'walls',      type: 'checkbox', checked: true,  caption: 'walls:' },
     { name: 'roof',      type: 'checkbox', checked: true,  caption: 'roof:' },
   
     { name: 'group2', type: 'group', caption: 'Materials' },
       { name: 'plywood', type: 'checkbox', checked: true,  caption: 'plywood:' },
 
  { name: 'wood', type: 'checkbox', checked: true,  caption: 'dimensional:' },
   
     
     ]
}

function main(params) {
   console.log(params)
  return shed(params)
}

module.exports = { main, getParameterDefinitions }
