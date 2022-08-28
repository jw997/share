const jscad = require('@jscad/modeling')

const { extrudeLinear } = require('@jscad/modeling').extrusions

const { poly2 } = require('@jscad/modeling').geometries

const { 
  torus,
  cuboid,
} = require('@jscad/modeling').primitives
const {
  colorize, 
  colorNameToRgb,
} = require('@jscad/modeling').colors
const {
  subtract,
  union
} = jscad.booleans

const {
  translate,
  translateX,
  translateY,
  translateZ,
  mirror,
  mirrorZ,
  mirrorY,
  mirrorX,
  rotateZ,
  rotate,
  rotateX,
  rotateY
} = jscad.transforms

// material colors
//let concrete = colorNameToRgb('lightblue')
// used for filters, must all be different colors
let wood = colorNameToRgb('yellow')
wood = [1,1,0,1]
let plywood = colorNameToRgb('brown')
plywood = [0.6470588235294118,0.16470588235294117,0.16470588235294117,1]
let rockbody = colorNameToRgb('darkgrey')
let rockface = colorNameToRgb('lightgrey')
let foam = colorNameToRgb('blue')
let sheetmetal = colorNameToRgb('silver')

// Standard Wood dimensions

const TWOBY=1.5
const THREEBY=2.5
const FOURBY=3.5
const SIXBY=5.5
const EIGHTBY=7.25

const EPS=0.05

// ***********************************
// Trailer dimensions from plans
// ***********************************
 let A = 168 // length of rectangle box 14 feet

  let B = 158 // length insdie of box
  let C = 69 // dist from front of box to wheel well
  let D = 63 // length of wheel well
  let E = 36 // dist from back of well to end of box
  // A = C + D+ E
  let boxOuterWidth = 96
  let boxInnerWidth = 80

  let wellOuterWidth = 96
  let wellInnerWidth = 84
  
  let boxHeight = 6
  let wellHeight = 8.5
  
// ***********************************
// Utility Functions
// ***********************************

function assert(condition, message) {
    if (!condition) {
        console.log( "ASSERT failed", message);
        throw message || "ASSERT failed";
    }
}

// elementwise diff of arrays to compute size for cuboid
function diff(a1, a2) {
  
  let retval = []
  for (let i = 0; i < a1.length; i++) {
    retval[i] = Math.abs(a2[i] - a1[i])
  }
  return retval
}

function sum(a1, a2) {
  let retval = []
  for (let i = 0; i < a1.length; i++) {
    retval[i] = a2[i] + a1[i]
  }
  return retval 
}

// compute center for cuboid
function avg(a1, a2) {
  let retval = []
  for (let i = 0; i < a1.length; i++) {
    retval[i] = (a2[i] + a1[i]) / 2
  }
  return retval
}

function scale(scaleFactor, array) {
  console.log("in",array);
  let retval = array.map((e) => e * scaleFactor)
  console.log("out",array)
  return retval;
}

// abc( [],[],number)
function abc(a,b,c) {

  assert(a.length == b.length, "input arrays same length")
  // a + b*c
  console.log("a",a,"b",b,"c",c)
  let retval= sum( a,scale(c,b))
  assert (a.length== retval.length, "output array same length")
  //return [...retval]
  return retval
}

// make cuboids out of corner,corner, material data
// infer top face has 2nd corner, shortest dimension
// example [{from:[0,0,0], to:[157.5, 1.5 ,5.5], color:wood}]
function arrtoitems(a) {
 // console.log("arrtoitems",a)
  let items = []

  for (let i = 0; i < a.length; i++) {
   // console.log("i",i)
    let f = a[i].from;
    assert( f.length == 3, "from length")
    let t = a[i].to;
    let c = a[i].color;

    let sz = diff(f, t);
    let cent = avg(f, t);

    let item = colorize(c, cuboid({
      size: sz,
      center: cent
    }))
  //  console.log(item)
    assert( item.polygons.length > 0, "real cuboid")
    items.push(item)
  }
 console.log("arrtoitems returning",items)
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

// make a sheet with a good side
// spec has properties from, to, color
/*  {
      from: [0, 0, 0],
      to: [96, 48, 0.75],
      color: plywood 
    }
    */
function sheet(spec,cutout) {
  let s1 = arrtoitems([spec])
  
  if (cutout === undefined) return s1[0]
  let s2 = arrtoitems([cutout])
  return colorize(spec.color, subtract(s1[0],s2[0]))
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

function makespecs( info ) {
  let retval = []
  if (info.copies === undefined) {
    let sp = {from:info.from,
            to: sum(info.from, info.offset),
            color: info.material}
    retval.push(sp)
  } else {
    for (let i = 0; i < info.copies.offsets.length; i++) {
      //console.log("loop",i)
      let k = info.copies.offsets[i]    
      let newfrom = abc(info.from,info.copies.dir,k);      
      assert(newfrom.length === 3,"new from length 3")      
      let newto = sum(newfrom,info.offset)      
      let sp = {from: newfrom  ,
            to: newto,
            color: info.material}
     // console.log("spec",sp)
      assert(sp.from.length==3,"from length 3")
      retval.push(sp)
      //console.log("retval length",retval.length)
      //console.log("retval ",retval)    
    }
  }
  return retval
}



//***************************************
// 
// WALL SYSTEM 2
//
//
// each board specified by start offset color
// e.g. plate={start:[0,0,0], offset:[96,3.5,1.5], wood}
// is a 2x4 plate 3 feet long
// 
// in case of identical sized parallel boards
// make one and copy it along an offset
// copy(board, offset direction, array of offset values
// copy(plate, [0,0,1], [93,94.5])

// wall lengths

// Roof consts
const O1=189
const O2=102
const O3=22.5
const O4=21.75

// drywall nailers
const O5=87.75
const O6=77.25

const P1LEN=93
const P2LEN=96

// skylight rough opening
const SLROW = 21.75
const SLROL = 32.75



function roof() {

  // half inch left end rails
  let drop = EIGHTBY-SIXBY-0.5
  
  // plywood
  let plyheight = drop+SIXBY
  
  let p1info = 
  {from:[TWOBY,3,plyheight],
   offset:[P1LEN-EPS,48-EPS,0.5],material:plywood,
   copies:{dir:[0,1,0],offsets:[0,48]}
  }
  
  let p2info = 
  {from:[O1+TWOBY,3,plyheight],
   offset:[-(P2LEN-EPS),48-EPS,0.5],material:plywood,
   copies:{dir:[0,1,0],offsets:[0,48]}
  }
  
  
  // hole corner is  
  // [TWOBY+P1LEN-TWOBY/2,3+O3+2*TWOBY]
  
  // frame skylight box with 2x6
  let slb1info = 
   {from:[TWOBY+P1LEN-TWOBY/2,3+O3+2*TWOBY,plyheight+0.5],
   offset:[TWOBY-EPS,SLROW+TWOBY-EPS,SIXBY],material:wood,
   copies:{dir:[-(SLROL+TWOBY),-TWOBY,0],offsets:[0,1]}
  }
  
  let slb2info = 
   {from:[TWOBY+P1LEN-TWOBY/2+TWOBY,3+O3+2*TWOBY,plyheight+0.5],
   offset:[-(SLROL+TWOBY-EPS),-(TWOBY-EPS),SIXBY],material:wood,
   copies:{dir:[-TWOBY, SLROW+TWOBY ,0],offsets:[0,1]}
  }
  
  let cutoutinfo = 
  {from:[TWOBY+P1LEN-TWOBY/2,3+O3+2*TWOBY,0],
   offset:[-SLROL,SLROW,12],material:plywood
  }
  
  console.error("Cutoutinfo", cutoutinfo)
  
  // 5 lengthwise 
  let O1info = 
  {from:[TWOBY,0,drop],
   offset:[O1-EPS,TWOBY,SIXBY-EPS],material:wood,
   copies:{dir:[0,1,0],offsets:[3,27,50.25,73.5,97.5]}
  }
  
  let O2info = 
  {from:[0,0,0],
   offset:[TWOBY,O2-EPS,EIGHTBY-EPS],material:wood,
   copies:{dir:[1,0,0],offsets:[0,O1+TWOBY]}
  }
  
  // blocks 
  let O3info = 
  {from:[O1,3+TWOBY,drop],
   offset:[-TWOBY,O3-EPS,SIXBY-EPS],material:wood,
   copies:{dir:[-1,0,0],offsets:[4.5,93.75,172.5]}
  }
  
    // blocks 
  let O3Leftinfo = 
  {from:[O1,73.5+TWOBY,drop],
   offset:[-TWOBY,O3-EPS,SIXBY-EPS],material:wood,
   copies:{dir:[-1,0,0],offsets:[4.5,93.75,172.5]}
  }
  
  

  
  
  // blocks 
  let O4info = 
  {from:[O1,27+TWOBY,EIGHTBY-0.5-SIXBY],
   offset:[-TWOBY,O4-EPS,SIXBY-EPS],material:wood,
   copies:{dir:[-1,0,0],offsets:[4.5,93.75,
   93.75+32.75+TWOBY,
   172.5]}
  }
  
  // flat O4 for light
  let O4Flatinfo = 
  
  {from:[O1-(93.75-24),27+TWOBY,drop],
   offset:[SIXBY,O4-EPS,TWOBY],material:wood,
   }
  
  
  // blocks 
  let O4Leftinfo = 
 {from:[O1,50.25+TWOBY,drop],
   offset:[-TWOBY,O4-EPS,SIXBY-EPS],material:wood,
   copies:{dir:[-1,0,0],offsets:[4.5,93.75,172.5]}
  }
  
   let O5info = 
  {from:[O1-3-2*TWOBY,0,drop],
   offset:[-O5,FOURBY-EPS,TWOBY-EPS],material:wood,
   copies:{dir:[0,1,0],offsets:[3+TWOBY,O2-3-TWOBY-FOURBY]}
  }
  
    let O6info = 
  {from:[O1-93.75-TWOBY,0,drop],
   offset:[-O6,FOURBY-EPS,TWOBY-EPS],material:wood,
   copies:{dir:[0,1,0],offsets:[3+TWOBY,O2-3-TWOBY-FOURBY]}
  }
  
  
  let specs = [].concat(

  makespecs(O1info),
  makespecs(O2info),
  makespecs(O3info),makespecs(O3Leftinfo),
  makespecs(O4info),makespecs(O4Leftinfo),
  makespecs(O4Flatinfo),
  makespecs(O5info),
  makespecs(O6info),
  makespecs(slb1info),
  makespecs(slb2info),

  )
  let items = arrtoitems(specs)
  
  let plywoodspecs = [].concat(
    makespecs(p1info),
    makespecs(p2info)
  )
  
  let plyitems = arrtoitems(plywoodspecs)
  
  // subtract skylight hole
  let plycutout = arrtoitems(makespecs(cutoutinfo))[0]
  
  for (i=0;i<plyitems.length;i++) {
    let oldcolor=plyitems[i].color
    plyitems[i] = subtract(  plyitems[i], plycutout)
    plyitems[i].color = oldcolor
  }
  
  
  items = items.concat(plyitems)// arrtoitems(plywoodspecs))
  
  items = translateY(-3,items)
  
  let theta = Math.atan(EIGHTBY / 164.5)
  items = translateX( -(O1-172.5),items)
  items = rotateY(theta,items)
  items = translateZ( 105.5-drop,items)
  
 // items = translateY(150,items)

  return items
}


// Right Wall consts
const R0= 92.25
const R1 = 65
const R2 = 67
const R3 = 32
const R4 = 6.5
const R5 = 161 
const R6 = 37.25
const R7 = 123.75 // TODO TOO LONG  127.25 by FOURBY
const R8 = 168
const R9 = 84.25



function rightwall() {

  let width=14*12
  let height=105.5
  
  let R0info = 
  {from:[FOURBY,0,TWOBY],
   offset:[TWOBY-EPS,FOURBY,R0-EPS],material:wood,
   copies:{dir:[1,0,0],
   offsets:[0,15,29,97.5,107,122.25,127.25,width-2*FOURBY-TWOBY-EPS]}
  }
  
  
  let Misc341info = 
  {from:[FOURBY,0,TWOBY],
   offset:[THREEBY-EPS,FOURBY,R0-EPS],material:wood,
   copies:{dir:[1,0,0],
   offsets:[139.25]}
  }
  
  let R9info = 
  {from:[FOURBY,0,TWOBY+R4+TWOBY],
   offset:[TWOBY-EPS,FOURBY,R9-EPS],material:wood,
   copies:{dir:[1,0,0],
   offsets:[60.5,76.5]}
  }
  
  let R9info34 = 
  {from:[FOURBY,0,TWOBY+R4+TWOBY],
   offset:[THREEBY-EPS,FOURBY,R9-EPS],material:wood,
   copies:{dir:[1,0,0],
   offsets:[43.25,91.25]}
  }
  
 
  let R4info = 
  {from:[FOURBY,0,TWOBY],
   offset:[TWOBY,FOURBY,R4-EPS],material:wood,
   copies:{dir:[1,0,0],
           offsets:[29+TWOBY,97.5-TWOBY]}
  }
  
 
  // plates
  let R1info = 
  {from:[FOURBY+97.5-TWOBY,0,0],
   offset:[R1,FOURBY,TWOBY-EPS],material:wood,
  
  }
  
  let R2info = 
   {from:[FOURBY+29+TWOBY,0,R4+TWOBY],
   offset:[R2,FOURBY,TWOBY-EPS],material:wood,
  
  }
  
  let R3info = 
 {from:[FOURBY,0,0],
   offset:[R3,FOURBY,TWOBY-EPS],material:wood,
  
  }
  

  // header
  let R5info = 
  {from:[FOURBY,0, TWOBY+R0],
   offset:[R5,FOURBY,TWOBY-EPS],material:wood,
  
  }
    // door cripples
  let R6info = 
   {from:[FOURBY+R7+FOURBY,0, TWOBY+R0+TWOBY],
   offset:[R6-EPS,FOURBY,TWOBY-EPS],material:wood,
  
  }
  
  
  let R7info = 
   {from:[FOURBY,0, TWOBY+R0+TWOBY],
   offset:[R7-EPS,FOURBY,TWOBY-EPS],material:wood,
  
  }
  
  

  let R8info = 
  {from:[0,0,0],
   offset:[R8,FOURBY,TWOBY-EPS],material:wood
  }
  
  
  let CCinfo = 
  {from:[FOURBY + 122.25 + TWOBY,FOURBY-TWOBY,TWOBY],
   offset:[FOURBY-EPS,TWOBY-EPS,R0],material:wood,
  }

  let specs = [].concat(
  makespecs(R0info),
  makespecs(Misc341info),
  makespecs(R1info),
  makespecs(R2info),
  makespecs(R3info),
  makespecs(R4info),
  makespecs(R5info),
  makespecs(R6info),
  makespecs(R7info),

  makespecs(R9info),
  makespecs(R9info34),

  makespecs(CCinfo),
  
  )
  let items = arrtoitems(specs)
  
  // make triangle pieces
  
  let Radspec1 = {from:[0,0, 0],
   offset:[164.5,TWOBY,EIGHTBY],material:wood,
  }
  let baseitem = arrtoitems(makespecs(Radspec1))
  
  let otheritem = arrtoitems(makespecs(Radspec1))
  
  let theta = Math.atan(EIGHTBY / 164.5)
  
  otheritem = rotateY(-theta,baseitem)
  raditem = subtract(baseitem,otheritem)
  raditem = translateX(-164.5/2,raditem)
  raditem =  rotateZ(Math.PI,raditem)
  raditem = translateY(TWOBY,raditem)
  raditem = translateX(164.5/2+FOURBY, raditem)
  raditem = colorize(wood,
  translateZ(R0+3*TWOBY, raditem))
  
  // copy 
  raditem2 = translateY(TWOBY,raditem)
  
  // tilt R8 and lift it up
  let r8item = arrtoitems(makespecs(R8info))
  r8item = rotateY(theta,r8item)
  r8item =  translateZ(R0+3*TWOBY+EIGHTBY, r8item)
  
  items.push(r8item)
 
  items.push(raditem)
  items.push(raditem2)

  return items


}

// left wall 
function leftwall() {

  let width=14*12
  let height=105.5
  
  let items=rightwall()
  items = translateY(8*12,mirrorY(items))
  
  let wellback = FOURBY+R3-TWOBY
  // header length 
  let hlen = 24+TWOBY+TWOBY
  let sillheight=42
  let windowoffset = R2-hlen
  let windowwidth=24
  let windowheight=36
  // make window cutouts 
  
  
  let cutoutinfo= 
   {from:[wellback,96,sillheight-2*TWOBY],
   offset:[windowwidth,-FOURBY,windowheight+2*TWOBY+FOURBY],material:wood,
   copies:{dir:[1,0,0],offsets:[0,R2-24]}
  }
  
  let cutout2 = arrtoitems(makespecs(cutoutinfo))
  let cutout =   union( cutout2[0], cutout2[1])
  
  // remove cutouts
  for (let i = 0; i < items.length; i++) {
    let oldcolor = items[i].color;
    items[i] = colorize(oldcolor,subtract(items[i],cutout))
  }
  // add headers
  
  let headerinfo= 
  {from:[wellback+EPS,96,sillheight+windowheight],
   offset:[hlen-EPS,-FOURBY,FOURBY-EPS],material:wood,
   copies:{dir:[1,0,0],offsets:[0,R2-hlen]}
  }
  
  // add jacks
  let jacklen = sillheight+windowheight-(R4+2*TWOBY)
  let jackinfo= 
  {from:[0,96,TWOBY+R4+TWOBY],
   offset:[TWOBY-EPS,-FOURBY,jacklen-EPS],material:wood,
   
   copies:{dir:[1,0,0],
   offsets:[wellback,wellback+hlen-TWOBY,
   wellback+windowoffset,wellback+hlen-TWOBY+windowoffset]}
  }
  
  let silltopinfo= 
  {from:[wellback+TWOBY+EPS,96,sillheight],
   offset:[hlen-2*TWOBY-EPS,-FOURBY,-TWOBY-EPS],material:wood,
   copies:{dir:[1,0,0],offsets:[0,windowoffset]}
  }
  
  let sillbottominfo= 
  {from:[wellback+TWOBY+EPS,96,sillheight-TWOBY],
   offset:[hlen-2*TWOBY-EPS,-FOURBY,-TWOBY-EPS],material:wood,
   copies:{dir:[1,0,0],offsets:[0,windowoffset]}
  }
  
  let studinfo = 
  
  {from:[0,96,TWOBY+R4+TWOBY],
  
   offset:[TWOBY-EPS,-FOURBY,R9-EPS],material:wood,
   
   copies:{dir:[1,0,0],
   offsets:[wellback+windowwidth+TWOBY+TWOBY,
  
   wellback+windowoffset-TWOBY]}
  }
  
  let specs = [].concat(
  makespecs(headerinfo),
  makespecs(jackinfo),
  makespecs(silltopinfo),
  makespecs(sillbottominfo),
  makespecs(studinfo)
  )
  
  //items = items.concat(arrtoitems(makespecs(headerinfo)))
  windowitems = arrtoitems(specs)
  
  return items.concat(windowitems)

}
 

// Front Wall consts
const F1 = 96
const F2 = 89
const F3 = 101
const F4 = 80.5
const F5 = 41

const F6 = 17 // 15.5 plans wrong?? 
const F7 = 76.5
const F8 = 37.5
const F9 = 24
const F10 = 27
const F11 = 19.5 + 1.5 // PLANS WRONG??


function frontwall() {
  let width=96
  let height=105.5
  
  
  // think from front of house, i.e. x=0
  // plates
  let F1info = 
  {from:[0,0,0],
   offset:[FOURBY,F1,TWOBY-EPS],material:wood,
   copies:{dir:[0,0,1],offsets:[0,TWOBY+F3]}
  }
  
  let F2info = 
  {from:[0,FOURBY,TWOBY+F3+TWOBY],
   offset:[FOURBY,F2,TWOBY-EPS],material:wood
  }
  
  // studs measure from left
  let F3info = 
  {from:[0,width,TWOBY],
   offset:[FOURBY,-(TWOBY-EPS),F3-EPS],material:wood,
   copies:{dir:[0,-1,0],
           offsets:[0,7,48+TWOBY,57,85.5,width-TWOBY]}
  }
  // door trimmers
  let F4info = 
  {from:[0,width,TWOBY],
   offset:[FOURBY,-(TWOBY-EPS),F4-EPS],material:wood,
   copies:{dir:[0,-1,0],
           offsets:[7+TWOBY,48]}
  }
  // header
  let F5info = 
   {from:[0,width-(7+TWOBY),TWOBY+F4],
   offset:[FOURBY,-(F5-EPS),FOURBY-EPS],material:wood
   
  }
    // door cripples
  let F6info = 
  {from:[0,width,TWOBY+ F4+ FOURBY],
   offset:[FOURBY,-(TWOBY-EPS),F6-EPS],material:wood,
   copies:{dir:[0,-1,0],
           offsets:[7+TWOBY,23,35,48]}
  }
  
    // window trimmers
  let F7info = 
  {from:[0,width,TWOBY],
   offset:[FOURBY,-(TWOBY-EPS),F7-EPS],material:wood,
   copies:{dir:[0,-1,0],
           offsets:[57+TWOBY,85.5-TWOBY]}
  }
  
  // window jacks
      // window trimmers
  let F8info = 
  {from:[0,width,TWOBY],
   offset:[FOURBY,-(TWOBY-EPS),F8-EPS],material:wood,
   copies:{dir:[0,-1,0],
           offsets:[57+2*TWOBY,72,85.5-2*TWOBY]}
  }
  
  let F11info = 
  {from:[0,width,TWOBY+F7+FOURBY],
   offset:[FOURBY,-(TWOBY-EPS),F11-EPS],material:wood,
   copies:{dir:[0,-1,0],
           offsets:[57+TWOBY,72,85.5-TWOBY]}
  }
  
  // WINDOW HEADER
   // header
  let F10info = 
   {from:[0,width-(57+TWOBY),TWOBY+F7],
   offset:[FOURBY,-(F10-EPS),FOURBY-EPS],material:wood
   
  }
  // rough sill
  let F9info = 
   {from:[0,width-(57+2*TWOBY),TWOBY+F8],
   offset:[FOURBY,-(F9-EPS),TWOBY-EPS],material:wood,
    copies:{dir:[0,0,1],
           offsets:[0,TWOBY]}
   
  }
  
  
  
  let CCinfo = 
  {from:[FOURBY-TWOBY,0,TWOBY],
   offset:[TWOBY,FOURBY-EPS,F3],material:wood,
   copies:{dir:[0,1,0],offsets:[TWOBY+EPS,width-TWOBY-FOURBY]}
  }
  
 
  
  let specs = [].concat(

  makespecs(F1info),
  makespecs(F2info),
  makespecs(F3info),
  makespecs(F4info),
  makespecs(F5info),
  makespecs(F6info),
  makespecs(F7info),
  makespecs(F8info),
  makespecs(F9info),
  makespecs(F10info),
  makespecs(F11info),
  makespecs(CCinfo),
  
  )
  let items = arrtoitems(specs)
  
  // push out items away from final spot in X dir
 // items = translate([18,0,12],items)
  
  return items
  
}
  
// Interior wall consts
const I0=92.25
const I1=89
const I2=96
const I3=80.5
const I4=31
const I5=6.75 + TWOBY //????? wrong length on plans

// x coord of interior wall??? 
//const R7 = 127.25

function interiorwall() {

  // TODO xpos hould be R7 + FOURBY
  let width=96
  let height=99.75
  // studs
  let I0info = 
  {from:[R7+FOURBY,width-FOURBY,TWOBY],
   offset:[FOURBY,-TWOBY-EPS,I0-EPS],material:wood,
   copies:{dir:[0,-1,0],offsets:[0,32.5,43,43+TWOBY,60.5,71.5,
   71.5+16]}
  }
  console.log("I0info",I0info)
  // plates
  let I1info = 
  {from:[R7+FOURBY,width-FOURBY,0],
   offset:[FOURBY,-(I1-EPS),TWOBY-EPS],material:wood,
   copies:{dir:[0,0,1],offsets:[0,I0+TWOBY,I0+3*TWOBY, I0+4*TWOBY]}
  
  }
  // extra long top plate
  let I2info = 
 {from:[R7+FOURBY,width,TWOBY+I0+TWOBY],
   offset:[FOURBY,-(I2-EPS),TWOBY-EPS],material:wood,
  }
  
  
  // doorway trimmers
  let I3info = 
  {from:[R7+FOURBY,width-FOURBY,TWOBY],
   offset:[FOURBY,-TWOBY-EPS,I3-EPS],material:wood,
   copies:{dir:[0,-1,0],offsets:[TWOBY,32.5-TWOBY]}
  }
  
  //header
  let I4info = 
  {from:[R7+FOURBY,width-FOURBY-TWOBY,TWOBY+I3],
   offset:[FOURBY,-(I4-EPS),FOURBY-EPS],material:wood
   
  }
  console.log("I4info",I4info)
  // shorts studs over header
  let I5info = 
  {from:[R7+FOURBY,width-FOURBY,TWOBY+I3+FOURBY],
   offset:[FOURBY,-TWOBY-EPS,I5-EPS],material:wood,
   copies:{dir:[0,-1,0],offsets:[TWOBY,16,32.5-TWOBY]}
  }
  console.log("I5info",I5info)

  
  let specs = [].concat(
  makespecs(I0info),
  makespecs(I1info),
  makespecs(I2info),
  makespecs(I3info),
  makespecs(I4info),
  makespecs(I5info)

  )
  let items = arrtoitems(specs)
  
  // push out items away from final spot in X dir
 // items = translate([18,0,12],items)
  
  return items
  
}

// back wall consts
const B0=92.25
const B1=96
const B2=89
const B3=80.5
const B4=37
const B5=6.75+TWOBY // wrong length on plans

function backwall() {
  let width=96
  let height=98.25
  //studs
  let B0info = 
  {from:[A,0,TWOBY],
   offset:[-FOURBY,TWOBY-EPS,B0-EPS],material:wood,
   copies:{dir:[0,1,0],offsets:[0,16,31,52.5,94.5]}
  }
  //bottom plate and first top plate
  let B1info = 
  {from:[A,0,0],
   offset:[-FOURBY,B1,TWOBY-EPS],material:wood,
   copies:{dir:[0,0,1],offsets:[0,B0+TWOBY]}
  }
  // top 2 plates
  let B2info = 
  {from:[A,FOURBY,TWOBY+B0+TWOBY],
   offset:[-FOURBY,B2,TWOBY-EPS],material:wood,
   copies:{dir:[0,0,1],offsets:[0,TWOBY]}
  }
  
  let B3info = 
  {from:[A,54,TWOBY],
   offset:[-FOURBY,TWOBY-EPS,B3-EPS],material:wood,
   copies:{dir:[0,1,0],offsets:[0,34+TWOBY]}
  }
  
  let B4info = 
  {from:[A,54,TWOBY+B3],
   offset:[-FOURBY,B4-EPS,FOURBY-EPS],material:wood
   
  }
  
  let B5info = 
  {from:[A,54,TWOBY+B3+FOURBY],
   offset:[-FOURBY,TWOBY,B5-EPS],material:wood,
   copies:{dir:[0,1,0],offsets:[EPS,11,23,34+TWOBY-EPS]}
  }
  
  let CCinfo = 
  {from:[A-(FOURBY-TWOBY),0,TWOBY],
   offset:[-TWOBY,FOURBY-EPS,B0],material:wood,
   copies:{dir:[0,1,0],offsets:[TWOBY+EPS,width-TWOBY-FOURBY]}
  }
  
  let ThreeByFourinfo = 
  {from:[A,46.75,TWOBY+EPS],
   offset:[-FOURBY,THREEBY,B0-2*EPS],material:wood
  
  }
  
  let specs = [].concat(
  makespecs(B0info),
  makespecs(B1info),
  makespecs(B2info),
  makespecs(B3info),
  makespecs(B4info),
  makespecs(B5info),
  makespecs(CCinfo),
  makespecs(ThreeByFourinfo)
  )
  let items = arrtoitems(specs)
  
  // push out items away from final spot in X dir
 // items = translate([18,0,12],items)
  
  return items
  
}

function wall() {

  return [].concat(backwall(),
        interiorwall(),frontwall(),
        rightwall(),
        leftwall()
    )
}




// ***********************************
// Building parts
// ***********************************

function subfloor() {

  let wellWidth = (wellOuterWidth - wellInnerWidth)/2
  // right rear sheet
  let rr = {from:[0,0,0],to:[72-.125,48-.125,0.75],color:plywood}
  let co =  {from:[E ,0 ,0],to:[72,wellWidth ,0.75],color:plywood}
  
  srr = sheet(rr,co)
  
  // right front sheet
  let rf = {from:[72,0,0],to:[72+96,48,0.75],color:plywood}
  co =  {from:[72,0 ,0],to:[E+D+0.125 ,wellWidth+0.125 ,0.75],color:plywood}
  srf = sheet(rf,co)
  
  // left rear sheet

  rr = {from:[0,48,0],to:[72-.125,96,0.75],color:plywood}
  co =  {from:[E ,96-wellWidth ,0],to:[72,96 ,0.75],color:plywood}
  
  slr = sheet(rr,co)
  
    
  // left front sheet
  let lf = {from:[72,48.125,0],to:[72+96,96,0.75],color:plywood}
  co =  {from:[72,96-wellWidth-.125 ,0],to:[E+D+.125 ,96 ,0.75],color:plywood}
  slf = sheet(lf,co)
  
  
  return [srr,srf,slr,slf]
}

const S1=157.5
const S2 = 76.5
function floorframing() {

  let S1info =  {from:[0,0,0],
   offset:[S1,TWOBY,SIXBY],
   material:wood,
   copies:{dir:[0,1,0],
           offsets:[0,S2+TWOBY]}
  }
  
  let S2info = {from:[S1,TWOBY,0],
   offset:[-TWOBY,S2,SIXBY],material:wood,
   copies:{dir:[-1,0,0],
           offsets:[0, 16, 30.75, 32.25, 50, 66, 82, 98, 114, 130, 146,
    156]}
  }
  
  let specs = makespecs(S1info).concat(makespecs(S2info))
  return arrtoitems(specs)
  
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
  let xshifts = [0, 16, 30.75, 32.25, 50, 66, 82, 98, 114, 130, 146,
    156
  ];

  // insulation blocks most are 14.5 inches wide
  let f1 = {
    from: [0, 1.5, 0],
    to: [14.5, 1.5 + 76.5, 5.5],
    color: foam
  };
  let foamxshifts = [1.5, 51.5, 67.5, 83.5, 99.5, 115.5, 131.5]
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

  // shift from and to .x by positions
  arr = arr.concat(xinc(j1, xshifts));

  arr = arr.concat(xinc(f1, foamxshifts));
  arr = arr.concat([f2, f3, f4])
  console.log ("floorframing", arr)
  return arrtoitems(arr)
}



function floorframingOLD() {
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
  let xshifts = [0, 16, 30.75, 32.25, 50, 66, 82, 98, 114, 130, 146,
    156
  ];

  // insulation blocks most are 14.5 inches wide
  let f1 = {
    from: [0, 1.5, 0],
    to: [14.5, 1.5 + 76.5, 5.5],
    color: foam
  };
  let foamxshifts = [1.5, 51.5, 67.5, 83.5, 99.5, 115.5, 131.5]
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

  // shift from and to .x by positions
  arr = arr.concat(xinc(j1, xshifts));

  arr = arr.concat(xinc(f1, foamxshifts));
  arr = arr.concat([f2, f3, f4])
  console.log ("floorframing", arr)
  return arrtoitems(arr)
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

  return colorize([0, 0, 0], union(backtire, fronttire))
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
 
  let wellWidth = (wellOuterWidth - wellInnerWidth) / 2
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

// ***********************************
// MAIN
// ***********************************

function main(params) {
  // put one item in to avoid empty items edge cases
  let items=[]
  items.push( colorize([1,2,3],cuboid({size:[1,1,1]})) )
   items.push( colorize([1,2,3],cuboid({size:[1,1,1]})) )
  
  let traileritems = trailer()
  if (params.trailer) {
    items = items.concat(traileritems)
  }
  // trailer leaves origin in inside bottom of back right corner
  
  let flooritems = floorframing()
  if (params.floor) {
    items = items.concat(flooritems)
  }
  //items = items.concat(floorframing())
  
  // move everything so origin is on top of trailer in 
  // back right corner
  // console.warn("Concat 1",items.concat)
  items = translate( [(A-B)/2,
                      (boxOuterWidth-boxInnerWidth)/2,
                      -boxHeight] , items)
                     
  //console.warn("Concat 2",items.concat)
  // plywood subfloor
  //items = items.concat(subfloor())
  if (params.floor)
    items = items.concat(subfloor())
    
  // move origin on top of subfloor
  items = translateZ( -3/4 , items)
  
 // studs=wall()
  //console.log("Studs",studs)
  if (params.frontwall)
    items=items.concat(frontwall())
    
  if (params.backwall)
    items=items.concat(backwall())
    
   if (params.interiorwall)
    items=items.concat(interiorwall())
    
   if (params.rightwall)
    items=items.concat(rightwall())
    
   if (params.leftwall)
    items=items.concat(leftwall())
    
   if (params.roof)
    items=items.concat(roof())
    
  console.error("filtering")
  console.log("wood is ",wood.toString())
   console.log("plywood is ",plywood.toString())
  // filter items by material
  let filtered = []
  for (i=0; i<items.length;i++) {
    let item = items[i]
    
    if (item.color == undefined) {
      console.error("undefined color", item)
    }
    console.log("color",item.color.toString())
    switch (item.color.toString()) {
      case wood.toString():
        if (params.wood) {
          filtered.push(item)
        }
        break;
      case plywood.toString():
        console.log("plywood item")
        if (params.plywood) {
          filtered.push(item)
        } else {
          console.log("plywood item skipped") 
        }
        break;
          
      default:
        filtered.push(item)
    }
  }
  
  let mainitems = [].concat(filtered, /*studs, roof()*/ axes())
  console.log ("MAIN TOTAL ITEM COUNT", mainitems.length)
  
  return mainitems
}

// ************
// menu
// ***************
const getParameterDefinitions = () => {
  console.log("Called getParamDef")

  return [
  { name: 'Parts', type: 'group', caption: 'Parts' },
  { name: 'trailer', type: 'checkbox', checked: true,  caption: 'trailer:' },
 
  { name: 'floor',      type: 'checkbox', checked: true,  caption: 'floor:' },

  //{ name: 'walls',      type: 'checkbox', checked: true,  caption: 'walls:' },
   { name: 'frontwall',      type: 'checkbox', checked: true,  caption: 'frontwall:' },
    { name: 'backwall',      type: 'checkbox', checked: true,  caption: 'backwall:' },
     { name: 'interiorwall',      type: 'checkbox', checked: true,  caption: 'interiorwall:' },
      { name: 'rightwall',      type: 'checkbox', checked: true,  caption: 'rightwall:' },
    { name: 'leftwall',      type: 'checkbox', checked: true,  caption: 'leftwall:' },
       
  { name: 'roof',      type: 'checkbox', checked: true,  caption: 'roof:' },
   
  { name: 'group2', type: 'group', caption: 'Materials' },
  { name: 'plywood', type: 'checkbox', checked: true,  caption: 'plywood:' },
 
  { name: 'wood', type: 'checkbox', checked: true,  caption: 'wood:' },
 // { name: 'insulation', type: 'checkbox', checked: true,  caption: 'insulation:' },
   
     
     ]
}

// ***********************************
// Exports
// ***********************************
module.exports = {
  main,getParameterDefinitions
}


//******************************
// UNUSED GARBAGE
// *****************************
