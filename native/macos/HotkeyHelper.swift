// HotkeyHelper.swift
// V2 upgrade path — replaces globalShortcut for keys Electron can't capture
// (Fn/Globe key, CapsLock, Right Option hold-to-record pattern)
//
// Build:  swiftc -O HotkeyHelper.swift -o ../../resources/HotkeyHelper
// Usage:  spawn as child_process from electron/main/hotkey.ts
//         reads hotkey events from stdout, one JSON line per event
//
// Currently NOT used in v1 (globalShortcut handles Alt+Space fine).
// Switch to this if you want Fn key or hold-to-record behaviour.

import Foundation
import Carbon

// ─── Configuration ────────────────────────────────────────────────────────────

let TARGET_KEY_CODE: Int64 = 49   // Space bar
let TARGET_MODIFIERS: Int64 = 2048 // Option (⌥)

// ─── Event output ─────────────────────────────────────────────────────────────

func emit(_ event: String) {
    let line = "{\"event\":\"\(event)\"}\n"
    print(line, terminator: "")
    fflush(stdout)
}

// ─── CGEventTap ───────────────────────────────────────────────────────────────

let eventMask = (1 << CGEventType.keyDown.rawValue) | (1 << CGEventType.keyUp.rawValue)

guard let tap = CGEvent.tapCreate(
    tap: .cgSessionEventTap,
    place: .headInsertEventTap,
    options: .defaultTap,
    eventsOfInterest: CGEventMask(eventMask),
    callback: { proxy, type, event, refcon in
        let keyCode = event.getIntegerValueField(.keyboardEventKeycode)
        let flags = event.flags.rawValue & 0xFFFF0000

        if keyCode == TARGET_KEY_CODE && flags == UInt64(TARGET_MODIFIERS) {
            if type == .keyDown {
                emit("keydown")
            } else {
                emit("keyup")
            }
            // Consume event — prevent system action
            return nil
        }
        return Unmanaged.passRetained(event)
    },
    userInfo: nil
) else {
    fputs("HotkeyHelper: CGEvent tap creation failed — Accessibility permission required\n", stderr)
    exit(1)
}

let runLoopSource = CFMachPortCreateRunLoopSource(kCFAllocatorDefault, tap, 0)
CFRunLoopAddSource(CFRunLoopGetCurrent(), runLoopSource, .commonModes)
CGEvent.tapEnable(tap: tap, enable: true)

// Signal ready
emit("ready")

// Run forever
CFRunLoopRun()
