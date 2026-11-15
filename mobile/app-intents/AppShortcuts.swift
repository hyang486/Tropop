import AppIntents

/// Spec 10.5. Every phrase must contain \(.applicationName) ("Tropop") plus other words.
/// "Hey Siri, Trok" would need INAlternativeAppNames and a device check (human item); not set here.
struct AppShortcuts: AppShortcutsProvider {
  static var appShortcuts: [AppShortcut] {
    AppShortcut(
      intent: AskQrewIntent(),
      phrases: [
        "Ask \(.applicationName)",
        "Ask \(.applicationName) a question",
      ],
      shortTitle: "Ask Trok",
      systemImageName: "bubble.left.and.text.bubble.right"
    )
  }
}
