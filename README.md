# Invexis
Stock analysis and AI powered Portfolio constructor 

```
Invexis
├─ flutter_app
│  ├─ .dart_tool
│  │  ├─ dartpad
│  │  │  └─ web_plugin_registrant.dart
│  │  ├─ package_config.json
│  │  ├─ package_config_subset
│  │  ├─ package_graph.json
│  │  └─ version
│  ├─ .idea
│  │  ├─ libraries
│  │  │  ├─ Dart_SDK.xml
│  │  │  └─ KotlinJavaRuntime.xml
│  │  ├─ modules.xml
│  │  ├─ runConfigurations
│  │  │  └─ main_dart.xml
│  │  └─ workspace.xml
│  ├─ android
│  │  ├─ app
│  │  │  └─ src
│  │  │     └─ main
│  │  │        └─ java
│  │  │           └─ io
│  │  │              └─ flutter
│  │  │                 └─ plugins
│  │  │                    └─ GeneratedPluginRegistrant.java
│  │  ├─ flutter_app_android.iml
│  │  ├─ gradle
│  │  │  └─ wrapper
│  │  │     └─ gradle-wrapper.jar
│  │  ├─ gradlew
│  │  ├─ gradlew.bat
│  │  └─ local.properties
│  ├─ flutter_app.iml
│  ├─ ios
│  │  ├─ Flutter
│  │  │  ├─ ephemeral
│  │  │  │  ├─ flutter_lldbinit
│  │  │  │  └─ flutter_lldb_helper.py
│  │  │  ├─ flutter_export_environment.sh
│  │  │  └─ Generated.xcconfig
│  │  └─ Runner
│  │     ├─ GeneratedPluginRegistrant.h
│  │     └─ GeneratedPluginRegistrant.m
│  ├─ macos
│  │  └─ Flutter
│  │     └─ ephemeral
│  │        ├─ Flutter-Generated.xcconfig
│  │        └─ flutter_export_environment.sh
│  └─ windows
│     └─ runner
├─ LICENSE
├─ python_backend
│  ├─ api.py
│  ├─ auth.py
│  ├─ Blacklitterman.py
│  ├─ market_data.py
│  ├─ monte_carlo.py
│  ├─ portfolio_game.py
│  └─ users.json
├─ react_frontend
│  ├─ invesight-market-hub
│  │  ├─ .DS_Store
│  │  ├─ bun.lockb
│  │  ├─ components.json
│  │  ├─ eslint.config.js
│  │  ├─ index.html
│  │  ├─ invesight-market-hub
│  │  │  └─ tailwind.config.js
│  │  ├─ package-lock.json
│  │  ├─ package.json
│  │  ├─ postcss.config.js
│  │  ├─ public
│  │  │  ├─ favicon.ico
│  │  │  ├─ placeholder.svg
│  │  │  └─ robots.txt
│  │  ├─ README.md
│  │  ├─ src
│  │  │  ├─ .DS_Store
│  │  │  ├─ App.css
│  │  │  ├─ App.tsx
│  │  │  ├─ components
│  │  │  │  ├─ AITipsSection.tsx
│  │  │  │  ├─ AttemptTracker.tsx
│  │  │  │  ├─ CombinedForecastChart.tsx
│  │  │  │  ├─ CommunityForum.tsx
│  │  │  │  ├─ ForecastChart.tsx
│  │  │  │  ├─ Invexislogo.tsx
│  │  │  │  ├─ NewsAnalyzer.tsx
│  │  │  │  ├─ PortfolioAllocationChart.tsx
│  │  │  │  ├─ PortfolioStatsPanel.tsx
│  │  │  │  ├─ PortfolioWeightInput.tsx
│  │  │  │  ├─ SavedPortfolioManager.tsx
│  │  │  │  ├─ SingleStockChart.tsx
│  │  │  │  ├─ StockProjection.tsx
│  │  │  │  ├─ StockSelector.tsx
│  │  │  │  └─ ui
│  │  │  │     ├─ accordion.tsx
│  │  │  │     ├─ alert-dialog.tsx
│  │  │  │     ├─ alert.tsx
│  │  │  │     ├─ aspect-ratio.tsx
│  │  │  │     ├─ avatar.tsx
│  │  │  │     ├─ badge.tsx
│  │  │  │     ├─ breadcrumb.tsx
│  │  │  │     ├─ button.tsx
│  │  │  │     ├─ calendar.tsx
│  │  │  │     ├─ card.tsx
│  │  │  │     ├─ carousel.tsx
│  │  │  │     ├─ chart.tsx
│  │  │  │     ├─ checkbox.tsx
│  │  │  │     ├─ collapsible.tsx
│  │  │  │     ├─ command.tsx
│  │  │  │     ├─ context-menu.tsx
│  │  │  │     ├─ dialog.tsx
│  │  │  │     ├─ drawer.tsx
│  │  │  │     ├─ dropdown-menu.tsx
│  │  │  │     ├─ form.tsx
│  │  │  │     ├─ hover-card.tsx
│  │  │  │     ├─ input-otp.tsx
│  │  │  │     ├─ input.tsx
│  │  │  │     ├─ label.tsx
│  │  │  │     ├─ menubar.tsx
│  │  │  │     ├─ navigation-menu.tsx
│  │  │  │     ├─ pagination.tsx
│  │  │  │     ├─ popover.tsx
│  │  │  │     ├─ progress.tsx
│  │  │  │     ├─ radio-group.tsx
│  │  │  │     ├─ resizable.tsx
│  │  │  │     ├─ scroll-area.tsx
│  │  │  │     ├─ select.tsx
│  │  │  │     ├─ separator.tsx
│  │  │  │     ├─ sheet.tsx
│  │  │  │     ├─ sidebar.tsx
│  │  │  │     ├─ skeleton.tsx
│  │  │  │     ├─ slider.tsx
│  │  │  │     ├─ sonner.tsx
│  │  │  │     ├─ switch.tsx
│  │  │  │     ├─ table.tsx
│  │  │  │     ├─ tabs.tsx
│  │  │  │     ├─ textarea.tsx
│  │  │  │     ├─ toast.tsx
│  │  │  │     ├─ toaster.tsx
│  │  │  │     ├─ toggle-group.tsx
│  │  │  │     ├─ toggle.tsx
│  │  │  │     ├─ tooltip.tsx
│  │  │  │     └─ use-toast.ts
│  │  │  ├─ hooks
│  │  │  │  ├─ use-mobile.tsx
│  │  │  │  └─ use-toast.ts
│  │  │  ├─ index.css
│  │  │  ├─ main.tsx
│  │  │  ├─ NewsWrapper.tsx
│  │  │  ├─ pages
│  │  │  │  ├─ Community.tsx
│  │  │  │  ├─ Forecaster.tsx
│  │  │  │  ├─ Index.tsx
│  │  │  │  ├─ News.tsx
│  │  │  │  └─ NotFound.tsx
│  │  │  ├─ StockProjectionWrapper.tsx
│  │  │  └─ vite-env.d.ts
│  │  ├─ tailwind.config.ts
│  │  ├─ tsconfig.app.json
│  │  ├─ tsconfig.json
│  │  ├─ tsconfig.node.json
│  │  └─ vite.config.ts
│  └─ __MACOSX
│     └─ invesight-market-hub
│        ├─ ._.DS_Store
│        └─ src
│           └─ ._.DS_Store
└─ README.md

```