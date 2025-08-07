{pkgs}: {
  channel = "stable-24.05";
  packages = [
    pkgs.nodejs_22
  ];
  idx.extensions = [
    "svelte.svelte-vscode"
    "vue.volar"
  ];
 
}