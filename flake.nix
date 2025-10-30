{
  description = "Typescript project";

  inputs = {
    nixpkgs.url = "nixpkgs"; # use nix registry nixpkgs
    flake-utils.url = "github:numtide/flake-utils";
  };

  outputs = { self, nixpkgs, flake-utils, ... }:
    flake-utils.lib.eachDefaultSystem (system:
      let
        pkgs = import nixpkgs {
          inherit system;
        };
      in {
        packages.default = pkgs.hello;
        devShells.default = pkgs.mkShell {
          buildInputs = with pkgs; [
            nodejs
            pnpm
            dprint
          ];
        };
      });
}