# Architecture Notes

## Preferred direction
Unless the existing repository establishes a different working stack, use:
- React + Vite + TypeScript for the application.
- GSAP for coordinated timelines and interface transitions.
- Three.js only where it materially improves the particle/star/portal experience.
- CSS for layout, typography, and straightforward effects.

Do not add a library just because it is available. Lenis is not required unless the final experience needs a specific smooth-scroll behaviour. Avoid adding a backend/database until a requirement demands one.

## Structural principles
- One shared gateway implementation.
- One reusable personal-experience template driven by recipient-specific data/configuration.
- Keep content separate from presentation and animation code.
- Use a small, explicit experience state machine for the gateway and navigation.
- Keep animation lifecycle cleanup correct when React components unmount or state changes.
- Lazy-load heavy 3D code where practical; provide a graceful fallback for unsupported devices.

## Suggested conceptual structure
Adapt this to the actual repository rather than blindly creating every folder.

```text
src/
  app/
  components/
    Starfield/
    ParticleReveal/
    PortalTransition/
    MessageLayout/
  experiences/
    recipient-one/
      content.ts
      theme.ts
    recipient-two/
      content.ts
      theme.ts
  pages/
    Gateway/
    ThroughMyEyes/
    Ending/
    YourTurn/
  styles/
```

## State flow
```text
GATEWAY_IDLE
  -> STAR_BURST
  -> PARTICLE_CONVERGENCE
  -> NEW_YEAR_REVEAL
  -> INVITATION_CODE
  -> CODE_VALIDATION
      -> RECIPIENT_ONE
      -> RECIPIENT_TWO
  -> PORTAL_TRANSITION
  -> THROUGH_MY_EYES
  -> ENDING
  -> OPTIONAL_YOUR_TURN
```

Keep the state machine no more complex than required. Page 4 can be omitted entirely until approved.

## Invitation-code caveat
If codes are checked entirely in frontend code, they are a routing/personalization mechanism, not secure access control: visitors can inspect the shipped bundle. Do not claim that the content is private or protected. If genuine confidentiality is required, discuss a server-side validation/content-delivery approach before implementation.

## Performance and accessibility
- Avoid unnecessary per-frame React state updates for particle simulation.
- Clean up GSAP timelines, event listeners, observers, and Three.js resources.
- Handle resize and device-pixel-ratio sensibly.
- Provide reduced-motion behaviour and a non-WebGL fallback.
- Ensure text contrast, keyboard access, visible focus, and semantic controls.
- Test narrow mobile screens as well as desktop.
