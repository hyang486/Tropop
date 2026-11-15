// Web-only stand-in for expo-symbols (registered in metro.config.js for platform 'web'). SF Symbols do not render on web,
// so SymbolView draws ink line icons with react-native-svg. Icon paths are vendored from Lucide (lucide-static 0.468.0).
// Lucide is ISC licensed: Copyright (c) for portions of Lucide are held by Cole Bemis 2013-2022 as part of Feather (MIT);
// all other copyright (c) for Lucide are held by Lucide Contributors 2022. Permission to use, copy, modify, and/or distribute
// this software for any purpose with or without fee is hereby granted, provided that the above copyright notice and this
// permission notice appear in all copies.
// SF Symbol name -> Lucide icon (generated; edit by hand if a symbol changes).
import { View, type StyleProp, type ViewStyle } from 'react-native';
import Svg, { Circle, Ellipse, Line, Path, Polygon, Polyline, Rect } from 'react-native-svg';

type El = [string, Record<string, string>];
const FILL = new Set(["diamond", "leaf", "moon", "navigation", "play", "star", "triangle"]);
const NAMES: Record<string, string> = {
 "chevron.right": "chevron-right",
 "chevron.left": "chevron-left",
 "chevron.up": "chevron-up",
 "chevron.down": "chevron-down",
 "xmark": "x",
 "xmark.circle": "circle-x",
 "xmark.circle.fill": "circle-x",
 "checkmark": "check",
 "exclamationmark.triangle": "triangle-alert",
 "exclamationmark.triangle.fill": "triangle-alert",
 "exclamationmark.circle": "circle-alert",
 "exclamationmark.circle.fill": "circle-alert",
 "doc": "file",
 "play.fill": "play",
 "photo": "image",
 "figure.walk": "footprints",
 "faceid": "scan-face",
 "clock": "clock",
 "trash": "trash-2",
 "scope": "crosshair",
 "plus": "plus",
 "plus.circle": "circle-plus",
 "minus.circle": "circle-minus",
 "person": "user",
 "person.2": "users",
 "person.2.fill": "users",
 "pencil.tip": "pen-tool",
 "megaphone": "megaphone",
 "location": "navigation",
 "location.fill": "navigation",
 "link": "link",
 "ellipsis.circle": "circle-ellipsis",
 "cup.and.saucer": "coffee",
 "camera": "camera",
 "calendar": "calendar",
 "bell": "bell",
 "arrow.up": "arrow-up",
 "arrow.right": "arrow-right",
 "doc.text": "file-text",
 "bandage": "bandage",
 "bed.double": "bed-double",
 "camera.macro": "flower",
 "checkmark.circle": "circle-check",
 "diamond.fill": "diamond",
 "drop": "droplet",
 "ellipsis.bubble": "message-circle-more",
 "eye.slash": "eye-off",
 "face.smiling": "smile",
 "flag.slash": "flag-off",
 "gearshape": "settings",
 "globe": "globe",
 "hourglass": "hourglass",
 "info.circle": "info",
 "leaf.fill": "leaf",
 "map": "map",
 "mappin.and.ellipse": "map-pin",
 "mappin.circle": "map-pin",
 "moon.fill": "moon",
 "music.note": "music",
 "person.2.wave.2": "users",
 "person.badge.plus": "user-plus",
 "person.crop.circle": "circle-user",
 "person.crop.circle.badge.questionmark": "circle-user",
 "person.text.rectangle": "contact",
 "photo.on.rectangle": "images",
 "qrcode": "qr-code",
 "qrcode.viewfinder": "scan-qr-code",
 "rectangle.portrait.and.arrow.right": "log-out",
 "questionmark.bubble": "message-circle-question",
 "questionmark.circle": "circle-help",
 "sparkles": "sparkles",
 "speaker.slash": "volume-x",
 "star.fill": "star",
 "sun.max.fill": "sun",
 "triangle.fill": "triangle",
 "bubble.left": "message-circle",
 "scan": "scan",
 "exclamationmark": "exclamation"
};
const ICONS: Record<string, El[]> = {"arrow-right": [["path", {"d": "M5 12h14"}], ["path", {"d": "m12 5 7 7-7 7"}]], "arrow-up": [["path", {"d": "m5 12 7-7 7 7"}], ["path", {"d": "M12 19V5"}]], "bandage": [["path", {"d": "M10 10.01h.01"}], ["path", {"d": "M10 14.01h.01"}], ["path", {"d": "M14 10.01h.01"}], ["path", {"d": "M14 14.01h.01"}], ["path", {"d": "M18 6v11.5"}], ["path", {"d": "M6 6v12"}], ["rect", {"x": "2", "y": "6", "width": "20", "height": "12", "rx": "2"}]], "bed-double": [["path", {"d": "M2 20v-8a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v8"}], ["path", {"d": "M4 10V6a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v4"}], ["path", {"d": "M12 4v6"}], ["path", {"d": "M2 18h20"}]], "bell": [["path", {"d": "M10.268 21a2 2 0 0 0 3.464 0"}], ["path", {"d": "M3.262 15.326A1 1 0 0 0 4 17h16a1 1 0 0 0 .74-1.673C19.41 13.956 18 12.499 18 8A6 6 0 0 0 6 8c0 4.499-1.411 5.956-2.738 7.326"}]], "calendar": [["path", {"d": "M8 2v4"}], ["path", {"d": "M16 2v4"}], ["rect", {"width": "18", "height": "18", "x": "3", "y": "4", "rx": "2"}], ["path", {"d": "M3 10h18"}]], "camera": [["path", {"d": "M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3z"}], ["circle", {"cx": "12", "cy": "13", "r": "3"}]], "check": [["path", {"d": "M20 6 9 17l-5-5"}]], "chevron-down": [["path", {"d": "m6 9 6 6 6-6"}]], "chevron-left": [["path", {"d": "m15 18-6-6 6-6"}]], "chevron-right": [["path", {"d": "m9 18 6-6-6-6"}]], "chevron-up": [["path", {"d": "m18 15-6-6-6 6"}]], "circle-alert": [["circle", {"cx": "12", "cy": "12", "r": "10"}], ["line", {"x1": "12", "x2": "12", "y1": "8", "y2": "12"}], ["line", {"x1": "12", "x2": "12.01", "y1": "16", "y2": "16"}]], "circle-check": [["circle", {"cx": "12", "cy": "12", "r": "10"}], ["path", {"d": "m9 12 2 2 4-4"}]], "circle-ellipsis": [["circle", {"cx": "12", "cy": "12", "r": "10"}], ["path", {"d": "M17 12h.01"}], ["path", {"d": "M12 12h.01"}], ["path", {"d": "M7 12h.01"}]], "circle-help": [["circle", {"cx": "12", "cy": "12", "r": "10"}], ["path", {"d": "M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"}], ["path", {"d": "M12 17h.01"}]], "circle-minus": [["circle", {"cx": "12", "cy": "12", "r": "10"}], ["path", {"d": "M8 12h8"}]], "circle-plus": [["circle", {"cx": "12", "cy": "12", "r": "10"}], ["path", {"d": "M8 12h8"}], ["path", {"d": "M12 8v8"}]], "circle-user": [["circle", {"cx": "12", "cy": "12", "r": "10"}], ["circle", {"cx": "12", "cy": "10", "r": "3"}], ["path", {"d": "M7 20.662V19a2 2 0 0 1 2-2h6a2 2 0 0 1 2 2v1.662"}]], "circle-x": [["circle", {"cx": "12", "cy": "12", "r": "10"}], ["path", {"d": "m15 9-6 6"}], ["path", {"d": "m9 9 6 6"}]], "clock": [["circle", {"cx": "12", "cy": "12", "r": "10"}], ["polyline", {"points": "12 6 12 12 16 14"}]], "coffee": [["path", {"d": "M10 2v2"}], ["path", {"d": "M14 2v2"}], ["path", {"d": "M16 8a1 1 0 0 1 1 1v8a4 4 0 0 1-4 4H7a4 4 0 0 1-4-4V9a1 1 0 0 1 1-1h14a4 4 0 1 1 0 8h-1"}], ["path", {"d": "M6 2v2"}]], "contact": [["path", {"d": "M16 2v2"}], ["path", {"d": "M7 22v-2a2 2 0 0 1 2-2h6a2 2 0 0 1 2 2v2"}], ["path", {"d": "M8 2v2"}], ["circle", {"cx": "12", "cy": "11", "r": "3"}], ["rect", {"x": "3", "y": "4", "width": "18", "height": "18", "rx": "2"}]], "crosshair": [["circle", {"cx": "12", "cy": "12", "r": "10"}], ["line", {"x1": "22", "x2": "18", "y1": "12", "y2": "12"}], ["line", {"x1": "6", "x2": "2", "y1": "12", "y2": "12"}], ["line", {"x1": "12", "x2": "12", "y1": "6", "y2": "2"}], ["line", {"x1": "12", "x2": "12", "y1": "22", "y2": "18"}]], "diamond": [["path", {"d": "M2.7 10.3a2.41 2.41 0 0 0 0 3.41l7.59 7.59a2.41 2.41 0 0 0 3.41 0l7.59-7.59a2.41 2.41 0 0 0 0-3.41l-7.59-7.59a2.41 2.41 0 0 0-3.41 0Z"}]], "droplet": [["path", {"d": "M12 22a7 7 0 0 0 7-7c0-2-1-3.9-3-5.5s-3.5-4-4-6.5c-.5 2.5-2 4.9-4 6.5C6 11.1 5 13 5 15a7 7 0 0 0 7 7z"}]], "eye-off": [["path", {"d": "M10.733 5.076a10.744 10.744 0 0 1 11.205 6.575 1 1 0 0 1 0 .696 10.747 10.747 0 0 1-1.444 2.49"}], ["path", {"d": "M14.084 14.158a3 3 0 0 1-4.242-4.242"}], ["path", {"d": "M17.479 17.499a10.75 10.75 0 0 1-15.417-5.151 1 1 0 0 1 0-.696 10.75 10.75 0 0 1 4.446-5.143"}], ["path", {"d": "m2 2 20 20"}]], "file": [["path", {"d": "M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z"}], ["path", {"d": "M14 2v4a2 2 0 0 0 2 2h4"}]], "file-text": [["path", {"d": "M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z"}], ["path", {"d": "M14 2v4a2 2 0 0 0 2 2h4"}], ["path", {"d": "M10 9H8"}], ["path", {"d": "M16 13H8"}], ["path", {"d": "M16 17H8"}]], "flag-off": [["path", {"d": "M8 2c3 0 5 2 8 2s4-1 4-1v11"}], ["path", {"d": "M4 22V4"}], ["path", {"d": "M4 15s1-1 4-1 5 2 8 2"}], ["line", {"x1": "2", "x2": "22", "y1": "2", "y2": "22"}]], "flower": [["circle", {"cx": "12", "cy": "12", "r": "3"}], ["path", {"d": "M12 16.5A4.5 4.5 0 1 1 7.5 12 4.5 4.5 0 1 1 12 7.5a4.5 4.5 0 1 1 4.5 4.5 4.5 4.5 0 1 1-4.5 4.5"}], ["path", {"d": "M12 7.5V9"}], ["path", {"d": "M7.5 12H9"}], ["path", {"d": "M16.5 12H15"}], ["path", {"d": "M12 16.5V15"}], ["path", {"d": "m8 8 1.88 1.88"}], ["path", {"d": "M14.12 9.88 16 8"}], ["path", {"d": "m8 16 1.88-1.88"}], ["path", {"d": "M14.12 14.12 16 16"}]], "footprints": [["path", {"d": "M4 16v-2.38C4 11.5 2.97 10.5 3 8c.03-2.72 1.49-6 4.5-6C9.37 2 10 3.8 10 5.5c0 3.11-2 5.66-2 8.68V16a2 2 0 1 1-4 0Z"}], ["path", {"d": "M20 20v-2.38c0-2.12 1.03-3.12 1-5.62-.03-2.72-1.49-6-4.5-6C14.63 6 14 7.8 14 9.5c0 3.11 2 5.66 2 8.68V20a2 2 0 1 0 4 0Z"}], ["path", {"d": "M16 17h4"}], ["path", {"d": "M4 13h4"}]], "globe": [["circle", {"cx": "12", "cy": "12", "r": "10"}], ["path", {"d": "M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20"}], ["path", {"d": "M2 12h20"}]], "hourglass": [["path", {"d": "M5 22h14"}], ["path", {"d": "M5 2h14"}], ["path", {"d": "M17 22v-4.172a2 2 0 0 0-.586-1.414L12 12l-4.414 4.414A2 2 0 0 0 7 17.828V22"}], ["path", {"d": "M7 2v4.172a2 2 0 0 0 .586 1.414L12 12l4.414-4.414A2 2 0 0 0 17 6.172V2"}]], "image": [["rect", {"width": "18", "height": "18", "x": "3", "y": "3", "rx": "2", "ry": "2"}], ["circle", {"cx": "9", "cy": "9", "r": "2"}], ["path", {"d": "m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21"}]], "images": [["path", {"d": "M18 22H4a2 2 0 0 1-2-2V6"}], ["path", {"d": "m22 13-1.296-1.296a2.41 2.41 0 0 0-3.408 0L11 18"}], ["circle", {"cx": "12", "cy": "8", "r": "2"}], ["rect", {"width": "16", "height": "16", "x": "6", "y": "2", "rx": "2"}]], "info": [["circle", {"cx": "12", "cy": "12", "r": "10"}], ["path", {"d": "M12 16v-4"}], ["path", {"d": "M12 8h.01"}]], "leaf": [["path", {"d": "M11 20A7 7 0 0 1 9.8 6.1C15.5 5 17 4.48 19 2c1 2 2 4.18 2 8 0 5.5-4.78 10-10 10Z"}], ["path", {"d": "M2 21c0-3 1.85-5.36 5.08-6C9.5 14.52 12 13 13 12"}]], "link": [["path", {"d": "M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"}], ["path", {"d": "M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"}]], "log-out": [["path", {"d": "M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"}], ["polyline", {"points": "16 17 21 12 16 7"}], ["line", {"x1": "21", "x2": "9", "y1": "12", "y2": "12"}]], "map": [["path", {"d": "M14.106 5.553a2 2 0 0 0 1.788 0l3.659-1.83A1 1 0 0 1 21 4.619v12.764a1 1 0 0 1-.553.894l-4.553 2.277a2 2 0 0 1-1.788 0l-4.212-2.106a2 2 0 0 0-1.788 0l-3.659 1.83A1 1 0 0 1 3 19.381V6.618a1 1 0 0 1 .553-.894l4.553-2.277a2 2 0 0 1 1.788 0z"}], ["path", {"d": "M15 5.764v15"}], ["path", {"d": "M9 3.236v15"}]], "map-pin": [["path", {"d": "M20 10c0 4.993-5.539 10.193-7.399 11.799a1 1 0 0 1-1.202 0C9.539 20.193 4 14.993 4 10a8 8 0 0 1 16 0"}], ["circle", {"cx": "12", "cy": "10", "r": "3"}]], "megaphone": [["path", {"d": "m3 11 18-5v12L3 14v-3z"}], ["path", {"d": "M11.6 16.8a3 3 0 1 1-5.8-1.6"}]], "message-circle": [["path", {"d": "M7.9 20A9 9 0 1 0 4 16.1L2 22Z"}]], "message-circle-more": [["path", {"d": "M7.9 20A9 9 0 1 0 4 16.1L2 22Z"}], ["path", {"d": "M8 12h.01"}], ["path", {"d": "M12 12h.01"}], ["path", {"d": "M16 12h.01"}]], "message-circle-question": [["path", {"d": "M7.9 20A9 9 0 1 0 4 16.1L2 22Z"}], ["path", {"d": "M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"}], ["path", {"d": "M12 17h.01"}]], "moon": [["path", {"d": "M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z"}]], "music": [["path", {"d": "M9 18V5l12-2v13"}], ["circle", {"cx": "6", "cy": "18", "r": "3"}], ["circle", {"cx": "18", "cy": "16", "r": "3"}]], "navigation": [["polygon", {"points": "3 11 22 2 13 21 11 13 3 11"}]], "pen-tool": [["path", {"d": "M15.707 21.293a1 1 0 0 1-1.414 0l-1.586-1.586a1 1 0 0 1 0-1.414l5.586-5.586a1 1 0 0 1 1.414 0l1.586 1.586a1 1 0 0 1 0 1.414z"}], ["path", {"d": "m18 13-1.375-6.874a1 1 0 0 0-.746-.776L3.235 2.028a1 1 0 0 0-1.207 1.207L5.35 15.879a1 1 0 0 0 .776.746L13 18"}], ["path", {"d": "m2.3 2.3 7.286 7.286"}], ["circle", {"cx": "11", "cy": "11", "r": "2"}]], "play": [["polygon", {"points": "6 3 20 12 6 21 6 3"}]], "plus": [["path", {"d": "M5 12h14"}], ["path", {"d": "M12 5v14"}]], "qr-code": [["rect", {"width": "5", "height": "5", "x": "3", "y": "3", "rx": "1"}], ["rect", {"width": "5", "height": "5", "x": "16", "y": "3", "rx": "1"}], ["rect", {"width": "5", "height": "5", "x": "3", "y": "16", "rx": "1"}], ["path", {"d": "M21 16h-3a2 2 0 0 0-2 2v3"}], ["path", {"d": "M21 21v.01"}], ["path", {"d": "M12 7v3a2 2 0 0 1-2 2H7"}], ["path", {"d": "M3 12h.01"}], ["path", {"d": "M12 3h.01"}], ["path", {"d": "M12 16v.01"}], ["path", {"d": "M16 12h1"}], ["path", {"d": "M21 12v.01"}], ["path", {"d": "M12 21v-1"}]], "scan": [["path", {"d": "M3 7V5a2 2 0 0 1 2-2h2"}], ["path", {"d": "M17 3h2a2 2 0 0 1 2 2v2"}], ["path", {"d": "M21 17v2a2 2 0 0 1-2 2h-2"}], ["path", {"d": "M7 21H5a2 2 0 0 1-2-2v-2"}]], "scan-face": [["path", {"d": "M3 7V5a2 2 0 0 1 2-2h2"}], ["path", {"d": "M17 3h2a2 2 0 0 1 2 2v2"}], ["path", {"d": "M21 17v2a2 2 0 0 1-2 2h-2"}], ["path", {"d": "M7 21H5a2 2 0 0 1-2-2v-2"}], ["path", {"d": "M8 14s1.5 2 4 2 4-2 4-2"}], ["path", {"d": "M9 9h.01"}], ["path", {"d": "M15 9h.01"}]], "scan-qr-code": [["path", {"d": "M17 12v4a1 1 0 0 1-1 1h-4"}], ["path", {"d": "M17 3h2a2 2 0 0 1 2 2v2"}], ["path", {"d": "M17 8V7"}], ["path", {"d": "M21 17v2a2 2 0 0 1-2 2h-2"}], ["path", {"d": "M3 7V5a2 2 0 0 1 2-2h2"}], ["path", {"d": "M7 17h.01"}], ["path", {"d": "M7 21H5a2 2 0 0 1-2-2v-2"}], ["rect", {"x": "7", "y": "7", "width": "5", "height": "5", "rx": "1"}]], "settings": [["path", {"d": "M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"}], ["circle", {"cx": "12", "cy": "12", "r": "3"}]], "smile": [["circle", {"cx": "12", "cy": "12", "r": "10"}], ["path", {"d": "M8 14s1.5 2 4 2 4-2 4-2"}], ["line", {"x1": "9", "x2": "9.01", "y1": "9", "y2": "9"}], ["line", {"x1": "15", "x2": "15.01", "y1": "9", "y2": "9"}]], "sparkles": [["path", {"d": "M9.937 15.5A2 2 0 0 0 8.5 14.063l-6.135-1.582a.5.5 0 0 1 0-.962L8.5 9.936A2 2 0 0 0 9.937 8.5l1.582-6.135a.5.5 0 0 1 .963 0L14.063 8.5A2 2 0 0 0 15.5 9.937l6.135 1.581a.5.5 0 0 1 0 .964L15.5 14.063a2 2 0 0 0-1.437 1.437l-1.582 6.135a.5.5 0 0 1-.963 0z"}], ["path", {"d": "M20 3v4"}], ["path", {"d": "M22 5h-4"}], ["path", {"d": "M4 17v2"}], ["path", {"d": "M5 18H3"}]], "star": [["path", {"d": "M11.525 2.295a.53.53 0 0 1 .95 0l2.31 4.679a2.123 2.123 0 0 0 1.595 1.16l5.166.756a.53.53 0 0 1 .294.904l-3.736 3.638a2.123 2.123 0 0 0-.611 1.878l.882 5.14a.53.53 0 0 1-.771.56l-4.618-2.428a2.122 2.122 0 0 0-1.973 0L6.396 21.01a.53.53 0 0 1-.77-.56l.881-5.139a2.122 2.122 0 0 0-.611-1.879L2.16 9.795a.53.53 0 0 1 .294-.906l5.165-.755a2.122 2.122 0 0 0 1.597-1.16z"}]], "sun": [["circle", {"cx": "12", "cy": "12", "r": "4"}], ["path", {"d": "M12 2v2"}], ["path", {"d": "M12 20v2"}], ["path", {"d": "m4.93 4.93 1.41 1.41"}], ["path", {"d": "m17.66 17.66 1.41 1.41"}], ["path", {"d": "M2 12h2"}], ["path", {"d": "M20 12h2"}], ["path", {"d": "m6.34 17.66-1.41 1.41"}], ["path", {"d": "m19.07 4.93-1.41 1.41"}]], "trash-2": [["path", {"d": "M3 6h18"}], ["path", {"d": "M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"}], ["path", {"d": "M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"}], ["line", {"x1": "10", "x2": "10", "y1": "11", "y2": "17"}], ["line", {"x1": "14", "x2": "14", "y1": "11", "y2": "17"}]], "triangle": [["path", {"d": "M13.73 4a2 2 0 0 0-3.46 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"}]], "triangle-alert": [["path", {"d": "m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3"}], ["path", {"d": "M12 9v4"}], ["path", {"d": "M12 17h.01"}]], "user": [["path", {"d": "M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"}], ["circle", {"cx": "12", "cy": "7", "r": "4"}]], "user-plus": [["path", {"d": "M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"}], ["circle", {"cx": "9", "cy": "7", "r": "4"}], ["line", {"x1": "19", "x2": "19", "y1": "8", "y2": "14"}], ["line", {"x1": "22", "x2": "16", "y1": "11", "y2": "11"}]], "users": [["path", {"d": "M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"}], ["circle", {"cx": "9", "cy": "7", "r": "4"}], ["path", {"d": "M22 21v-2a4 4 0 0 0-3-3.87"}], ["path", {"d": "M16 3.13a4 4 0 0 1 0 7.75"}]], "volume-x": [["path", {"d": "M11 4.702a.705.705 0 0 0-1.203-.498L6.413 7.587A1.4 1.4 0 0 1 5.416 8H3a1 1 0 0 0-1 1v6a1 1 0 0 0 1 1h2.416a1.4 1.4 0 0 1 .997.413l3.383 3.384A.705.705 0 0 0 11 19.298z"}], ["line", {"x1": "22", "x2": "16", "y1": "9", "y2": "15"}], ["line", {"x1": "16", "x2": "22", "y1": "9", "y2": "15"}]], "x": [["path", {"d": "M18 6 6 18"}], ["path", {"d": "m6 6 12 12"}]], "exclamation": [["path", {"d": "M12 4v11"}], ["path", {"d": "M12 20h.01"}]]};
const TAGS: Record<string, any> = { path: Path, circle: Circle, line: Line, rect: Rect, polyline: Polyline, polygon: Polygon, ellipse: Ellipse };
const warned = new Set<string>();

export type SymbolViewProps = {
  name: string;
  size?: number;
  tintColor?: unknown;
  style?: StyleProp<ViewStyle>;
  [key: string]: unknown;
};

const toCss = (c: unknown) => (typeof c === 'string' ? c : '#302B28');

export function SymbolView({ name, size = 24, tintColor, style, accessibilityLabel }: SymbolViewProps) {
  const icon = NAMES[name];
  const els = icon ? ICONS[icon] : undefined;
  if (!els) {
    if (__DEV__ && !warned.has(name)) {
      warned.add(name);
      console.warn(`[web symbol] no web icon for "${name}"`);
    }
    return <View style={[{ width: size, height: size }, style]} />;
  }
  const color = toCss(tintColor);
  const filled = FILL.has(icon);
  return (
    <View style={[{ width: size, height: size }, style]} accessibilityLabel={accessibilityLabel as string | undefined}>
      <Svg width={size} height={size} viewBox="0 0 24 24" fill={filled ? color : 'none'} stroke={color} strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round">
        {els.map(([tag, at], i) => {
          const T = TAGS[tag];
          return <T key={i} {...at} />;
        })}
      </Svg>
    </View>
  );
}
