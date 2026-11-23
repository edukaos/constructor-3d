// Librerías: se importan acá (módulo) y quedan como globales para los scripts de la app, que se cargan después en orden.
import * as THREE from 'three';
import {OrbitControls} from 'three/addons/controls/OrbitControls.js';
import {TransformControls} from 'three/addons/controls/TransformControls.js';
import {RoundedBoxGeometry} from 'three/addons/geometries/RoundedBoxGeometry.js';
import {STLLoader} from 'three/addons/loaders/STLLoader.js';
import {Brush, Evaluator, ADDITION, SUBTRACTION, INTERSECTION} from 'three-bvh-csg';
import {toCreasedNormals} from 'three/addons/utils/BufferGeometryUtils.js';
import {FontLoader} from 'three/addons/loaders/FontLoader.js';
import {computeBoundsTree, acceleratedRaycast} from 'three-mesh-bvh';
Object.assign(window,{THREE,OrbitControls,TransformControls,RoundedBoxGeometry,STLLoader,Brush,Evaluator,ADDITION,SUBTRACTION,INTERSECTION,toCreasedNormals,FontLoader,computeBoundsTree,acceleratedRaycast});
