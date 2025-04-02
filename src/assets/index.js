// // Option 1: Import the assets (Vite will handle the bundling)
import NextGenLogoSvg from './NextGen-Logo.svg';
import NextGenLogo from './NextGen-Logo.png';
import ReactLogo from './react.svg';

export {
  NextGenLogo,
  NextGenLogoSvg,
  ReactLogo
};

// // Option 2 (alternative): Use the base path from Vite config
// const NextGenLogoSvg = '/nextgen/assets/NextGen-Logo.svg';
// const NextGenLogo = '/nextgen/assets/NextGen-Logo.png';
// import ReactLogo from './react.svg';

// export {
//   NextGenLogo,
//   NextGenLogoSvg,
//   ReactLogo
// };