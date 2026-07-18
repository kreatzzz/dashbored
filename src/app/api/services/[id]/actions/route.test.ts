import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getSession: vi.fn(),
  getAdapter: vi.fn(),
  getServiceContext: vi.fn(),
  headers: vi.fn(),
  isTrustedRequestOrigin: vi.fn(),
  findUnique: vi.fn(),
  createAudit: vi.fn(),
  syncPortainerLaunchers: vi.fn(),
}));

vi.mock("next/headers", () => ({ headers: mocks.headers }));
vi.mock("@/lib/auth", () => ({ auth: { api: { getSession: mocks.getSession } } }));
vi.mock("@/lib/adapters", () => ({ getAdapter: mocks.getAdapter }));
vi.mock("@/lib/launchers", () => ({ syncPortainerLaunchers: mocks.syncPortainerLaunchers }));
vi.mock("@/lib/prisma", () => ({ prisma: { serviceInstance: { findUnique: mocks.findUnique }, actionAudit: { create: mocks.createAudit } } }));
vi.mock("@/lib/services", () => ({ getServiceContext: mocks.getServiceContext }));
vi.mock("@/lib/request-origin", () => ({ isTrustedRequestOrigin: mocks.isTrustedRequestOrigin }));

import { POST } from "./route";

const portainerService = { id: "portainer-1", adapterType: "portainer" };
const genericService = { id: "generic-1", adapterType: "generic" };
const action = { id: "stop", label: "Stop", description: "Stop it", tone: "warning" as const, confirmation: "STOP" };
const context = { id: "provider", name: "Portainer", baseUrl: "http://server.home.arpa", launchUrl: "http://server.home.arpa", credentials: {}, configuration: {} };

function request(serviceId = "portainer-1") {
  return new Request(`http://dashbored.test/api/services/${serviceId}/actions`, {
    method: "POST",
    headers: { "content-type": "application/json", origin: "http://dashbored.test" },
    body: JSON.stringify({ action: "stop", target: "container-1", confirmation: "STOP" }),
  });
}

describe("POST /api/services/[id]/actions", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    mocks.getSession.mockReset().mockResolvedValue({ user: { id: "owner-1" } });
    mocks.headers.mockReset().mockResolvedValue(new Headers());
    mocks.isTrustedRequestOrigin.mockReset().mockReturnValue(true);
    mocks.findUnique.mockReset().mockResolvedValue(portainerService);
    mocks.createAudit.mockReset().mockResolvedValue({});
    mocks.getServiceContext.mockReset().mockResolvedValue(context);
    mocks.syncPortainerLaunchers.mockReset().mockResolvedValue({ discovered: 1 });
    mocks.getAdapter.mockReset().mockReturnValue({ getAvailableActions: vi.fn().mockResolvedValue([action]), executeAction: vi.fn().mockResolvedValue({ message: "Container stop requested" }) });
  });

  it("refreshes Portainer inventory after a successful container action", async () => {
    const response = await POST(request(), { params: Promise.resolve({ id: "portainer-1" }) });

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ message: "Container stop requested. Launcher inventory refreshed." });
    expect(mocks.syncPortainerLaunchers).toHaveBeenCalledWith(portainerService);
    expect(mocks.createAudit).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ status: "success", target: "container-1" }) }));
  });

  it("keeps the action successful when the follow-up inventory sync fails", async () => {
    mocks.syncPortainerLaunchers.mockRejectedValue(new Error("Portainer unavailable"));
    const warn = vi.spyOn(console, "warn").mockImplementation(() => undefined);

    const response = await POST(request(), { params: Promise.resolve({ id: "portainer-1" }) });

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ message: "Container stop requested" });
    expect(warn).toHaveBeenCalled();
    expect(mocks.createAudit).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ status: "success" }) }));
  });

  it("does not add an inventory read to actions for non-Portainer services", async () => {
    mocks.findUnique.mockResolvedValue(genericService);

    const response = await POST(request("generic-1"), { params: Promise.resolve({ id: "generic-1" }) });

    expect(response.status).toBe(200);
    expect(mocks.syncPortainerLaunchers).not.toHaveBeenCalled();
  });
});
