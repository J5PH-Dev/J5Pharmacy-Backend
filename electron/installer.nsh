!macro customInit
  nsExec::ExecToStack 'node --version'
  Pop $0
  Pop $1
  ${If} $0 != 0
    MessageBox MB_YESNO|MB_ICONEXCLAMATION "Node.js is not installed. Would you like to download and install it now?" IDYES download IDNO abort
    abort:
      Abort "Node.js is required to run this application. Installation cancelled."
    download:
      ExecShell "open" "https://nodejs.org/dist/v20.11.0/node-v20.11.0-x64.msi"
      MessageBox MB_OK|MB_ICONINFORMATION "Please install Node.js and then run this installer again."
      Abort "Please run the installer again after installing Node.js."
  ${EndIf}
!macroend 