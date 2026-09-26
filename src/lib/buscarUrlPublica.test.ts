import { describe, expect, it } from "vitest";
import { buscarUrlPublica, ipBloqueado } from "@/lib/buscarUrlPublica";

describe("ipBloqueado", () => {
  it.each([
    "127.0.0.1",
    "10.1.2.3",
    "172.16.0.1",
    "172.31.255.255",
    "192.168.15.156",
    "169.254.169.254",
    "100.64.0.1",
    "0.0.0.0",
    "::1",
    "::",
    "::ffff:127.0.0.1",
    "::ffff:169.254.169.254",
    "fe80::1",
    "fd00::1",
    "não é ip",
  ])("bloqueia %s", (ip) => {
    expect(ipBloqueado(ip)).toBe(true);
  });

  it.each(["8.8.8.8", "172.32.0.1", "2606:4700:4700::1111"])(
    "libera %s",
    (ip) => {
      expect(ipBloqueado(ip)).toBe(false);
    },
  );
});

describe("buscarUrlPublica", () => {
  it.each([
    "http://127.0.0.1/",
    "http://[::1]/",
    "http://[::ffff:7f00:1]/",
    "http://169.254.169.254/latest/meta-data/",
    "http://192.168.0.1/",
    "http://localhost:3000/",
    "file:///etc/passwd",
    "http://usuario:senha@exemplo.com/",
    "não é url",
  ])("recusa %s", async (url) => {
    await expect(buscarUrlPublica(url)).rejects.toThrow("URL inválida.");
  });
});
