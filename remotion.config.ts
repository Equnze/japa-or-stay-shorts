// Remotion CLI settings. Lean defaults because this PC has ~6 GB RAM:
// one browser tab at a time, JPEG frames, and x264 at CRF 18 for crisp pixels.
import { Config } from '@remotion/cli/config';

Config.setConcurrency(1);
Config.setVideoImageFormat('jpeg');
Config.setJpegQuality(95);
Config.setCodec('h264');
Config.setCrf(18);
Config.setPixelFormat('yuv420p');
Config.setOverwriteOutput(true);
// If the bundled headless Chrome cannot be downloaded, point Remotion at the system Chrome:
// Config.setBrowserExecutable('C:/Program Files/Google/Chrome/Application/chrome.exe');
