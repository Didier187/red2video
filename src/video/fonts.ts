import { loadFont as loadPlayfairDisplay } from '@remotion/google-fonts/PlayfairDisplay'
import { loadFont as loadIBMPlexMono } from '@remotion/google-fonts/IBMPlexMono'

const playfair = loadPlayfairDisplay('normal', {
  weights: ['400', '700'],
  subsets: ['latin'],
})

const ibmPlex = loadIBMPlexMono('normal', {
  weights: ['400', '600'],
  subsets: ['latin'],
})

export const fonts = {
  playfair: playfair.fontFamily,
  ibmPlex: ibmPlex.fontFamily,
}
