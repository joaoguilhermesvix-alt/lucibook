import React, { useState, useMemo, useRef } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { OrbitControls, Environment, ContactShadows } from "@react-three/drei";
import { Sparkles, Layers } from "lucide-react";
import * as THREE from "three";

// A component to draw a single curved lash
function LashGroup({ position, isRight, type, color = "#0f0f0f" }: { position: [number, number, number], isRight: boolean, type: string, color?: string }) {
  const hairs = useMemo(() => {
    const arr = [];
    const numHairs = type.includes("Mega") ? 150 :
                     type.includes("Russo") ? 100 :
                     (type.includes("Clássico") || type.includes("Fio a Fio")) ? 50 : 70;

    const baseLength = type.includes("Mega") ? 0.3 : type.includes("Delineado") ? 0.15 : 0.25;
    
    // Eyelid arch
    const width = 0.6;
    for (let i = 0; i < numHairs; i++) {
      const t = (i / numHairs);
      
      // Arc coordinates
      const x = (t - 0.5) * width;
      const y = Math.sin(t * Math.PI) * 0.1; // Arch height
      const z = Math.cos(t * Math.PI) * 0.15; // Curved forward slightly

      const startVec = new THREE.Vector3(x, y, z);
      
      const rand = Math.sin(i * 1000) * 0.5;
      const lengthMod = type.includes("Mega") ? 1.2 + rand : 1 + rand*0.3;
      const length = baseLength * lengthMod;

      // Calculate direction
      let outAngle = (t - 0.5) * 1.5; // Fan outwards
      if (isRight) outAngle *= -1;
      
      let upAngle = 0.5 + (1 - Math.sin(t * Math.PI)) * 0.5; // Points somewhat up

      const endX = x + Math.sin(outAngle) * length;
      const endY = y + Math.cos(upAngle) * length * 1.2;
      const endZ = z + length * 0.5 + Math.cos(outAngle)*0.1; // Curving up and forward

      const cpX = x + (endX - x) * 0.5;
      const cpY = y + (endY - y) * 0.5 - 0.05; // Drop control point for curve
      const cpZ = z + (endZ - z) * 0.5 + 0.1;

      const curve = new THREE.CatmullRomCurve3([
        startVec,
        new THREE.Vector3(cpX, cpY, cpZ),
        new THREE.Vector3(endX, endY, endZ)
      ]);

      arr.push(curve);
    }
    return arr;
  }, [type, isRight]);

  return (
    <group position={position}>
      {hairs.map((curve, i) => (
        <mesh key={i}>
          <tubeGeometry args={[curve, 8, type.includes("Mega") ? 0.005 : 0.003, 4, false]} />
          <meshStandardMaterial color={color} roughness={0.8} />
        </mesh>
      ))}
    </group>
  );
}

// The mannequin head
function MannequinHead({ lashStyle }: { lashStyle: string }) {
  const group = useRef<THREE.Group>(null);
  
  // Floating animation
  useFrame((state) => {
    if (group.current) {
      group.current.position.y = Math.sin(state.clock.elapsedTime * 0.5) * 0.05;
    }
  });

  return (
    <group ref={group}>
      {/* Base Head shape */}
      <mesh position={[0, 0, 0]} castShadow receiveShadow>
        <sphereGeometry args={[2, 64, 64]} />
        <meshStandardMaterial color="#fcd5ce" roughness={0.4} />
      </mesh>
      
      {/* Chin extension to make it less spherical and more oval */}
      <mesh position={[0, -0.8, 0.5]} castShadow receiveShadow>
        <sphereGeometry args={[1.5, 64, 64]} />
        <meshStandardMaterial color="#fcd5ce" roughness={0.4} />
      </mesh>

      {/* Nose */}
      <mesh position={[0, -0.2, 1.9]} castShadow receiveShadow>
        <capsuleGeometry args={[0.15, 0.3, 16, 16]} />
        <meshStandardMaterial color="#fcd5ce" roughness={0.5} />
      </mesh>

      {/* Eyes area indentations (simulated by darker patches or geometry, we'll use small dark spheres for eyeballs) */}
      {/* Left Eye */}
      <mesh position={[-0.8, 0.3, 1.7]} rotation={[0, -0.2, 0]}>
        <sphereGeometry args={[0.3, 32, 32]} />
        <meshStandardMaterial color="#ffffff" roughness={0.1} metalness={0.1} />
        {/* Iris */}
        <mesh position={[0, 0, 0.28]}>
           <sphereGeometry args={[0.12, 32, 32]} />
           <meshStandardMaterial color="#3a2e25" />
        </mesh>
      </mesh>

      {/* Right Eye */}
      <mesh position={[0.8, 0.3, 1.7]} rotation={[0, 0.2, 0]}>
        <sphereGeometry args={[0.3, 32, 32]} />
        <meshStandardMaterial color="#ffffff" roughness={0.1} metalness={0.1} />
        {/* Iris */}
        <mesh position={[0, 0, 0.28]}>
           <sphereGeometry args={[0.12, 32, 32]} />
           <meshStandardMaterial color="#3a2e25" />
        </mesh>
      </mesh>

      {/* Lashes */}
      {lashStyle && (
        <>
          <LashGroup position={[-0.8, 0.45, 1.85]} isRight={false} type={lashStyle} />
          <group scale={[-1, 1, 1]}>
            <LashGroup position={[-0.8, 0.45, 1.85]} isRight={false} type={lashStyle} />
          </group>
        </>
      )}
    </group>
  );
}

export default function ProLuci3D() {
  const [selectedStyle, setSelectedStyle] = useState<string>("Volume Russo");

  const lashStyles = [
    "Volume Clássico", // Included to match previous options basically
    "Volume Russo",
    "Wispy",
    "Volume Y",
    "Efeito Molhado",
    "Mega Volume",
    "Fio a Fio",
    "Cílios 3D",
    "Cílios 4D",
    "Cílios 5D",
    "Efeito Delineado",
  ];

  return (
    <div className="space-y-6 flex flex-col h-[calc(100vh-6rem)]">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-main tracking-tight flex items-center gap-2">
            <Layers className="w-8 h-8 text-[var(--accent)]" />
            3D Luci
          </h1>
          <p className="text-sub mt-1">
            Simulador Espacial Interativo. Gire e aproxime o rosto para ver os detalhes.
          </p>
        </div>
      </div>

      <div className="flex-1 grid grid-cols-1 lg:grid-cols-4 gap-6 min-h-0">
        {/* 3D Canvas Area */}
        <div className="lg:col-span-3 glass-panel relative overflow-hidden rounded-3xl h-[50vh] lg:h-full">
          <Canvas camera={{ position: [0, 0.5, 5], fov: 45 }}>
            <color attach="background" args={['#ffe4e6']} />
            <ambientLight intensity={0.5} />
            <directionalLight position={[10, 10, 5]} intensity={1} castShadow shadow-mapSize={[1024, 1024]} />
            <directionalLight position={[-10, 5, 5]} intensity={0.5} />
            
            <MannequinHead lashStyle={selectedStyle} />
            
            <ContactShadows position={[0, -2.5, 0]} opacity={0.4} scale={10} blur={2} far={4} />
            <Environment preset="city" />
            <OrbitControls 
              enablePan={false} 
              minDistance={2} 
              maxDistance={8}
              minPolarAngle={Math.PI / 3}
              maxPolarAngle={Math.PI / 1.5}
            />
          </Canvas>

          {/* Quick instructions overlay */}
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-white/70 backdrop-blur-md px-4 py-2 rounded-full text-sm font-medium text-gray-700 pointer-events-none drop-shadow-md">
             Use o mouse/dedo para arrastar e dar zoom
          </div>
        </div>

        {/* Controls Area */}
        <div className="glass-panel p-6 flex flex-col h-full overflow-hidden">
          <h3 className="font-semibold text-gray-800 mb-4 flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-pink-500" />
            Modelos de Fios
          </h3>
          
          <div className="overflow-y-auto custom-scrollbar flex-1 pr-2 space-y-2">
            {lashStyles.map((style) => (
              <button
                key={style}
                onClick={() => setSelectedStyle(style)}
                className={`w-full text-left px-4 py-3 rounded-xl transition-all font-medium border ${
                  selectedStyle === style
                    ? "bg-gradient-to-r from-pink-400 to-purple-400 text-white shadow-md border-transparent"
                    : "bg-white/50 text-gray-700 hover:bg-white/80 border-white/60"
                }`}
              >
                {style}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
