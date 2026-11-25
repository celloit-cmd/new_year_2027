# Skills Usage Guide

## Purpose
This project has access to animation, Three.js, GSAP, shader and frontend development skills. Use them selectively to improve implementation quality without wasting context.

## Activation rules
1. Read a skill's full instructions only when its expertise is relevant to the current task.
2. Prefer the most specific skill over loading several overlapping skills.
3. Do not repeatedly load instructions already available in the current task context.
4. Do not install additional skills without identifying a concrete missing capability.
5. Follow skill guidance alongside the project's `AGENTS.md` and architecture decisions.
6. Skills are guidance, not permission to introduce unnecessary dependencies or complexity.
7. Start with 1–3 relevant skills per task; load more only when the task genuinely spans additional disciplines.

## Skill selection by task

### Three.js and 3D
For the starfield, particle simulation, portal, or genuinely 3D effects:
- `threejs-fundamentals`
- `threejs-react-three-fiber`
- `threejs-performance`
- `threejs-lighting`
- `threejs-shaders`
- `threejs-geometry`
- `threejs-postprocessing`

### Particles and shaders
For the star explosion, particle convergence, and particle-based typography:
- `particle-system`
- `shader-glsl`
- `threejs-shaders`
- `threejs-materials`

### GSAP and animation
For coordinated timelines, transitions, text reveals, and interactions:
- `gsap-core`
- `gsap-timeline`
- `gsap-react`
- `gsap-performance`
- `gsap-plugins`
- `cinematic-gsap-lenis-motion-system`

### Visual direction and storytelling
For visual composition, pacing, typography, and cinematic sequences:
- `motion-art-direction`
- `shot-composition`
- `kinetic-typography`
- `cinematic-scroll-storytelling`
- `page-transition-animation`
- `animation-principles`

### Frontend polish and accessibility
For interface interactions and usability reviews:
- `accessible-animation`
- `micro-interaction`
- `60fps-animation`
- `glassmorphism` only if the design genuinely calls for it.

## Project-specific restrictions
- Do not use Three.js for ordinary page layouts or simple CSS effects.
- Do not use GSAP for every small interaction when CSS is sufficient.
- Avoid Lenis unless smooth scrolling provides a clear benefit.
- Page 2 must remain minimal and message-focused. Avoid excessive animation.
- Respect `prefers-reduced-motion`.
- Prioritize performance on mid-range mobile devices.
- Avoid adding dependencies simply because a related skill exists.

## Suggested skill selection by milestone

| Milestone | Relevant expertise |
|---|---|
| Visual planning | `motion-art-direction`, `shot-composition` |
| Starfield | `threejs-fundamentals`, `particle-system` |
| Particle typography | `particle-system`, `shader-glsl`, `kinetic-typography` |
| Portal | `threejs-shaders`, `gsap-timeline` |
| Page transitions | `gsap-core`, `gsap-react` |
| Message page | `accessible-animation`, `micro-interaction` |
| Optimization | `threejs-performance`, `gsap-performance`, `60fps-animation` |

Inspect installed skill instructions before relying on their specific implementation guidance. Do not assume a skill is available merely because it is listed here; verify it in the active environment when needed.
