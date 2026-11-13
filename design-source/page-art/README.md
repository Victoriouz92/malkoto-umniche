# Original page artwork — 13 November 2026

28 original storybook scenes and two transparent red-panda animation atlases were generated with the built-in image_gen tool. The existing landing hero supplied the style reference. Prompts and the initial puzzle scene brief are preserved in manifest.json; original PNGs are retained here.

The four existing landing scenes are exclusive to the landing page. Each category, main screen, parent tab and album picture has its own scene. Shared brand icons and the recurring mascot are intentional.

Run `npm run build:page-art` to produce the responsive 600/1200px WebP scenes and 1152×768px transparent atlases. Run `npm run check:page-art` to verify sizes, alpha and source uniqueness. Source PNGs are not shipped in the offline cache.

Each atlas has six square frames in three columns and two rows. The menu wave lasts 4.5 seconds after 12 seconds of inactivity, then waits 35–55 seconds. Interaction dismisses it. There is no mascot overlay during games, PIN entry or information reading. Reduced-motion preferences suppress menu appearances and show a still celebration pose.
