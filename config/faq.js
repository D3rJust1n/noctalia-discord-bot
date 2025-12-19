module.exports = [
    // Installation & Compatibility
    {
        id: 'other-distributions',
        question: 'How can I run Noctalia on distributions other than Arch and NixOS?',
        answer: 'Most distributions offer `quickshell`. If you can install either, you can use Noctalia. If your distro doesn\'t provide Quickshell, you can build it from source.',
        category: 'installation',
    },
    {
        id: 'window-managers',
        question: 'What window managers does Noctalia support?',
        answer: 'Noctalia is designed for and tested with Hyprland and Niri. While it may work with other compositors, we currently only support workspace indicators for Niri and Hyprland.',
        category: 'installation',
    },
    
    // Configuration
    {
        id: 'missing-icons',
        question: 'Why are some of my app icons missing?',
        answer: 'The issue is most likely that your environment variables and icons theme are not set properly.\n\nAdd these variables via your compositor or to `/etc/environment` and reboot. On NixOS, use `environment.variables` or `home.sessionVariables`.\n\n**Option 1: If you prefer GTK**\nSet `QT_QPA_PLATFORMTHEME=gtk3`\nThen use an utility like `nwg-look` (available in most distros) to select and apply your favorite icons theme.\n\n**Option 2: If you prefer Qt**\nSet `QT_QPA_PLATFORMTHEME=qt6ct`\nThen run `qt6ct` to select and apply your favorite icons theme.\n\n**Option 3: Force an icon theme for Quickshell**\nSet `QS_ICON_THEME="youricontheme"`\n\n**For Niri users:**\nEnsure that you set environment variables properly. If you prefer set these in Niri\'s config, ensure that you also launch Noctalia via Niri:\n```\nspawn-at-startup "qs" "-c" "noctalia-shell"\n```\nThis is because Niri only override environment variables for processes it spawns.\n\nIf you prefer systemd, you can edit the noctalia.service:\n1. Edit the user service configuration: `systemctl edit --user noctalia.service`\n2. Add variables in the [Service] section:\n```\n[Service]\nEnvironment="QT_QPA_PLATFORM=wayland;xcb"\nEnvironment="QT_QPA_PLATFORMTHEME=qt6ct"\nEnvironment="QT_AUTO_SCREEN_SCALE_FACTOR=1"\n```\n3. Reload and restart the service:\n```\nsystemctl --user daemon-reload\nsystemctl --user restart noctalia.service\n```',
        category: 'configuration',
    },
    {
        id: 'ui-bigger',
        question: 'How can I make the UI bigger?',
        answer: 'You can start noctalia-shell like this to make the UI bigger:\n`QT_SCALE_FACTOR=2 qs -c noctalia-shell`\n\nYou might have to play around with the scale factor to fit your needs. This can also be added to your compositor autostart.',
        category: 'configuration',
    },
    {
        id: 'language',
        question: 'How can I get Noctalia to display in my language?',
        answer: 'Noctalia automatically uses your operating system\'s language settings. If the application appears in English, it\'s likely because a translation for your language isn\'t available yet, causing it to use English as a fallback.\n\n**How to Change the Language**\nChanging Noctalia\'s language involves adjusting your computer\'s system-wide language settings, not a setting within the app itself.\n\n1. **Check if Your Language is Supported**\nFirst, you can see which translations are included with Noctalia. Look inside the installation folder for a directory named `/Assets/Translations`. You\'ll find files ending in .json, named with language codes (e.g., es.json for Spanish, fr.json for French, de.json for German). If you don\'t see a file for your language, you\'ll need to use one that is available.\n\n2. **Set Your System Language**\nYou\'ll need to change the primary language for your entire operating system. The method varies by distribution. For command-line users, the localectl command is common. For example, to set your language to Spanish (Spain), you would run:\n```\nsudo localectl set-locale LANG=es_ES.UTF-8\n```\n\nAfter changing your system\'s language, restart Noctalia for the changes to take effect.\n\nIf Noctalia doesn\'t support your language yet, consider contributing a translation! Check the project\'s repository on GitHub for instructions on how to contribute.',
        category: 'configuration',
    },
    {
        id: 'fingerprint',
        question: 'How do I enable fingerprint authentication on the lockscreen?',
        answer: 'Noctalia supports fingerprint authentication via PAM. To enable it:\n\n1. **Edit the PAM configuration file** at `~/.config/noctalia/pam/password.conf`\n2. **Uncomment the fingerprint line** by removing the `#`:\n```\nauth sufficient pam_fprintd.so max-tries=1\nauth required pam_unix.so\n```\n3. **Install required packages**: `fprintd` and `pam_fprintd`\n4. **Enroll your fingerprint** (if needed): `fprintd-enroll`\n5. **Restart Noctalia** for changes to take effect\n\nAfter enabling, you can unlock using either your fingerprint or password. The fingerprint will be attempted first (max 1 try), then it falls back to password authentication.\n\n**Note:** The PAM configuration file is created automatically on first launch. If it doesn\'t exist, restart Noctalia and it will be generated.',
        category: 'configuration',
    },
    
    // Window Manager Integration
    {
        id: 'empty-workspaces',
        question: 'How can I make empty or unused workspaces always show up in Hyprland?',
        answer: 'To make workspaces always visible, even when empty, you need to set them as persistent in your hyprland.conf file. You can find the specific syntax and examples in the official documentation for Workspace Rules.\n\n```\nworkspace = 1, monitor:DP-1, persistent:true\nworkspace = 2, monitor:DP-1, persistent:true\nworkspace = 3, monitor:DP-1, persistent:true\nworkspace = 4, monitor:DP-1, persistent:true\nworkspace = 5, monitor:DP-1, persistent:true\n```',
        category: 'window-manager',
    },
    
    // Troubleshooting
    {
        id: 'keybinds-not-working',
        question: 'Why aren\'t my keybinds working?',
        answer: 'Common causes:\n\n1. **Wrong command syntax**: Make sure you\'re using the correct IPC command format\n2. **Window manager configuration**: Verify your keybind syntax matches your WM (Hyprland vs Niri)\n3. **Noctalia not running**: Keybinds only work when Noctalia is running',
        category: 'troubleshooting',
    },
    {
        id: 'apps-not-in-launcher',
        question: 'Why wont some applications appear in the launcher?',
        answer: 'The launcher looks for `.desktop` files in standard locations. If an application doesn\'t appear:\n\n1. **Refresh the launcher cache** by restarting Noctalia.\n2. **Verify that a `.desktop` file exists** in one of these directories:\n   * `/usr/share/applications/`\n   * `~/.local/share/applications/`\n   * `$HOME/.nix-profile/share/applications/` (apps installed with Nix/Home Manager)\n   * `/etc/profiles/per-user/$USER/share/applications/` (system/user-wide Nix profiles)\n3. **Create a `.desktop` file manually** for custom applications if none is provided.',
        category: 'troubleshooting',
    },
    {
        id: 'crash-on-startup',
        question: 'Why does Noctalia crash on startup?',
        answer: '1. **Check the error output** by running Noctalia from the terminal\n2. **Update dependencies** - outdated Quickshell versions can cause issues\n3. **Check system logs** for additional error information',
        category: 'troubleshooting',
    },
    {
        id: 'weird-gap',
        question: 'Why do I have a weird gap?',
        answer: 'This usually means `noctalia-shell` is running more than once (for example, launched by both your compositor autostart and the systemd service). Multiple instances fight over layout space and leave blank gaps.\n\nMake sure only a single instance is started:\n\n1. Stop extra copies (`kill -9 qs` or reboot)\n2. Pick one startup method (manual, compositor autostart, systemd, or Home Manager) and disable the others',
        category: 'troubleshooting',
    },
    {
        id: 'cant-unlock-lockscreen',
        question: 'Why can\'t I unlock my lock screen?',
        answer: 'openSUSE in particular does not provide the required `/etc/pam.d/login`. You must create an `/etc/pam.d/login` manually. Execute:\n\n```\nsudo tee /etc/pam.d/login <<\'EOF\'\n%PAM-1.0\nauth       include      common-auth\naccount    include      common-account\npassword   include      common-password\nsession    include      common-session\nEOF\n```',
        category: 'troubleshooting',
    },
    {
        id: 'screen-recorder',
        question: 'Why wont my screen recorder start recording?',
        answer: 'Common causes:\n\n1. **Missing package**: Make sure you\'re have installed the proper package or flatpak\n2. **Portal crashed**: Verify the status of your xdg-desktop-portal-xxx service and/or restart it. On Niri the gnome portal is recommended and can be restarted using the following command: `systemctl --user restart xdg-desktop-portal-gnome.service`\n3. **Change the video source**: In Noctalia\'s settings, switch the source from portal to screen. And try recording.\n4. **Check output in terminal**: `gpu-screen-recorder -w screen -f 60 -a default_output -o video.mp4`',
        category: 'troubleshooting',
    },
    
    // Appearance & UI
    {
        id: 'shell-looks-different',
        question: 'Why does the shell look different than expected?',
        answer: '1. **Check your theme settings** in the settings panel\n2. **Verify your display settings** - scaling and resolution can affect appearance\n3. **Update to the latest version** - UI improvements are frequently released',
        category: 'appearance',
    },
    {
        id: 'clipboard-preview-weird',
        question: 'Why does my clipboard history preview look weird?',
        answer: '**How to fix:**\n\n1. Open Noctalia\'s Settings -> Color Scheme -> Generate templates for predefined schemes -> UI -> Check the Qt checkbox (skip this part if you have your own Qt theme).\n2. Install **qt5ct** and **qt6ct** on your system, then set both Color schemes to **noctalia**.\n3. Check **>clip** again to see if the theme is applied (if not try to restart noctalia or logout/login again)',
        category: 'appearance',
    },
];
