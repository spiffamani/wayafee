"use client";

import { useEffect, useMemo, useState } from "react";
import { isAddress, zeroAddress } from "viem";
import { PageShell } from "@/components/Brand";
import { ConnectWallet } from "@/components/ConnectWallet";
import {
  useAccount,
  usePublicClient,
  useReadContract,
  useReadContracts,
  useWriteContract,
} from "wagmi";
import { erc20Abi, splitRemitAbi } from "@/lib/abis";
import { ADDRESSES, EXPLORER } from "@/lib/chain";
import { loadContacts, saveContacts, type Contact } from "@/lib/contacts";
import { formatFxrp, parseFxrp, shortAddr } from "@/lib/format";

const SPLIT_REMIT = ADDRESSES.splitRemit;
const configured = SPLIT_REMIT !== zeroAddress;

function ContactsPanel({
  contacts,
  setContacts,
}: {
  contacts: Contact[];
  setContacts: (c: Contact[]) => void;
}) {
  const [name, setName] = useState("");
  const [address, setAddress] = useState("");

  return (
    <div className="card space-y-4 p-5 sm:p-6">
      <div>
        <h2 className="text-lg font-extrabold">Saved contacts</h2>
        <p className="mt-1 text-xs text-muted">Stored in this browser only — no backend, on purpose.</p>
      </div>
      <div className="space-y-2">
        {contacts.length === 0 && (
          <p className="text-sm text-muted">Nobody yet. Add the people you send to.</p>
        )}
        {contacts.map((c) => (
          <div
            key={c.address}
            className="flex items-center justify-between gap-3 rounded-2xl bg-surface-2 px-3 py-3"
          >
            <div className="min-w-0">
              <p className="font-bold">{c.name}</p>
              <p className="mono truncate text-xs text-muted">{shortAddr(c.address, 8)}</p>
            </div>
            <button
              className="shrink-0 text-xs font-semibold text-danger"
              onClick={() => setContacts(contacts.filter((x) => x.address !== c.address))}
            >
              Remove
            </button>
          </div>
        ))}
      </div>
      <div className="space-y-2 border-t border-line pt-4">
        <input
          className="input text-sm"
          placeholder="Name (e.g. Mum)"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
        <input
          className="input mono text-sm"
          placeholder="Flare address 0x…"
          value={address}
          onChange={(e) => setAddress(e.target.value.trim())}
        />
        <button
          className="btn-ghost w-full text-sm"
          disabled={
            !name.trim() ||
            !isAddress(address) ||
            contacts.some((c) => c.address.toLowerCase() === address.toLowerCase())
          }
          onClick={() => {
            setContacts([...contacts, { name: name.trim(), address: address as `0x${string}` }]);
            setName("");
            setAddress("");
          }}
        >
          Add contact
        </button>
      </div>
    </div>
  );
}

function CreatePlanPanel({
  contacts,
  onCreated,
}: {
  contacts: Contact[];
  onCreated: () => void;
}) {
  const publicClient = usePublicClient();
  const { writeContractAsync } = useWriteContract();
  const [planName, setPlanName] = useState("");
  const [shares, setShares] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const selected = contacts.filter((c) => Number(shares[c.address] ?? 0) > 0);
  const totalPct = selected.reduce((s, c) => s + Number(shares[c.address] ?? 0), 0);
  const valid = planName.trim() && selected.length > 0 && Math.abs(totalPct - 100) < 1e-9;

  async function create() {
    if (!publicClient) return;
    setError(null);
    try {
      setBusy("Confirm in wallet…");
      const recipients = selected.map((c) => c.address);
      const bps = selected.map((c) => Math.round(Number(shares[c.address]) * 100));
      const sum = bps.reduce((a, b) => a + b, 0);
      bps[0] += 10_000 - sum;
      const hash = await writeContractAsync({
        address: SPLIT_REMIT,
        abi: splitRemitAbi,
        functionName: "createPlan",
        args: [planName.trim(), recipients, bps],
      });
      setBusy("Saving plan on Flare…");
      const receipt = await publicClient.waitForTransactionReceipt({ hash });
      if (receipt.status !== "success") throw new Error("createPlan reverted");
      setPlanName("");
      setShares({});
      onCreated();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="card space-y-4 p-5 sm:p-6">
      <div>
        <h2 className="text-lg font-extrabold">New split plan</h2>
        <p className="mt-1 text-xs text-muted">
          Percentages must total 100. Saved on-chain — reuse it after every mint.
        </p>
      </div>
      <input
        className="input text-sm"
        placeholder='Plan name (e.g. "Family — Lagos")'
        value={planName}
        onChange={(e) => setPlanName(e.target.value)}
      />
      {contacts.length === 0 ? (
        <p className="text-sm text-muted">Add contacts first.</p>
      ) : (
        <div className="space-y-2">
          {contacts.map((c) => (
            <div key={c.address} className="flex items-center gap-3 text-sm">
              <span className="min-w-0 flex-1 truncate font-semibold">{c.name}</span>
              <input
                className="input w-24 text-right"
                type="number"
                min="0"
                max="100"
                step="0.5"
                placeholder="0"
                value={shares[c.address] ?? ""}
                onChange={(e) => setShares({ ...shares, [c.address]: e.target.value })}
              />
              <span className="w-4 text-muted">%</span>
            </div>
          ))}
          <p
            className={`text-right text-xs font-bold ${
              Math.abs(totalPct - 100) < 1e-9 ? "text-ledger" : "text-amber"
            }`}
          >
            total {totalPct}%
          </p>
        </div>
      )}
      {error && <p className="msg-error">{error}</p>}
      <button className="btn-primary w-full" disabled={!valid || busy !== null} onClick={create}>
        {busy ?? "Save plan on-chain"}
      </button>
    </div>
  );
}

interface PlanView {
  id: bigint;
  name: string;
  active: boolean;
  recipients: readonly `0x${string}`[];
  sharesBps: readonly number[];
}

function ExecutePanel({
  plan,
  contacts,
  onDone,
}: {
  plan: PlanView;
  contacts: Contact[];
  onDone: () => void;
}) {
  const { address } = useAccount();
  const publicClient = usePublicClient();
  const { writeContractAsync } = useWriteContract();
  const [amount, setAmount] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [doneTx, setDoneTx] = useState<string | null>(null);

  const { data: balance } = useReadContract({
    address: ADDRESSES.fxrp,
    abi: erc20Abi,
    functionName: "balanceOf",
    args: address ? [address] : undefined,
    query: { enabled: !!address },
  });

  const parsed = parseFxrp(amount);
  const nameOf = (addr: string) =>
    contacts.find((c) => c.address.toLowerCase() === addr.toLowerCase())?.name ?? shortAddr(addr);

  const preview = useMemo(() => {
    if (parsed === null || parsed === 0n) return null;
    const amounts: bigint[] = new Array(plan.sharesBps.length).fill(0n);
    let assigned = 0n;
    for (let i = 1; i < plan.sharesBps.length; i++) {
      amounts[i] = (parsed * BigInt(plan.sharesBps[i])) / 10_000n;
      assigned += amounts[i];
    }
    amounts[0] = parsed - assigned;
    return amounts;
  }, [parsed, plan.sharesBps]);

  async function execute() {
    if (!publicClient || !address || parsed === null || parsed === 0n) return;
    setError(null);
    try {
      const allowance = await publicClient.readContract({
        address: ADDRESSES.fxrp,
        abi: erc20Abi,
        functionName: "allowance",
        args: [address, SPLIT_REMIT],
      });
      if (allowance < parsed) {
        setBusy("Approve FXRP in wallet…");
        const approveHash = await writeContractAsync({
          address: ADDRESSES.fxrp,
          abi: erc20Abi,
          functionName: "approve",
          args: [SPLIT_REMIT, parsed],
        });
        setBusy("Waiting for approval…");
        const r = await publicClient.waitForTransactionReceipt({ hash: approveHash });
        if (r.status !== "success") throw new Error("Approval reverted");
      }
      setBusy("Confirm the split in wallet…");
      const hash = await writeContractAsync({
        address: SPLIT_REMIT,
        abi: splitRemitAbi,
        functionName: "executePlan",
        args: [plan.id, ADDRESSES.fxrp, parsed],
      });
      setBusy("Splitting atomically on Flare…");
      const receipt = await publicClient.waitForTransactionReceipt({ hash });
      if (receipt.status !== "success") throw new Error("executePlan reverted");
      setDoneTx(hash);
      setAmount("");
      onDone();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="mt-4 space-y-3 border-t border-line pt-4">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <input
          className="input text-sm"
          placeholder="Amount of FXRP to split"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
        />
        {balance !== undefined && (
          <button
            className="shrink-0 text-xs font-bold text-flare underline"
            onClick={() => setAmount(formatFxrp(balance))}
          >
            max {formatFxrp(balance)}
          </button>
        )}
      </div>
      {preview && (
        <div className="space-y-1 text-sm">
          {plan.recipients.map((r, i) => (
            <div key={r} className="flex justify-between gap-3">
              <span className="min-w-0 truncate text-muted">
                {nameOf(r)} · {plan.sharesBps[i] / 100}%
              </span>
              <span className="mono shrink-0 font-bold">{formatFxrp(preview[i])} FXRP</span>
            </div>
          ))}
        </div>
      )}
      {error && <p className="msg-error">{error}</p>}
      {doneTx && (
        <p className="msg-ok">
          Split executed —{" "}
          <a className="underline" href={`${EXPLORER}/tx/${doneTx}`} target="_blank" rel="noreferrer">
            view transaction
          </a>
        </p>
      )}
      <button
        className="btn-primary w-full text-sm"
        disabled={parsed === null || parsed === 0n || busy !== null}
        onClick={execute}
      >
        {busy ?? "Split now (one transaction)"}
      </button>
    </div>
  );
}

export default function SplitPage() {
  const { address, isConnected } = useAccount();
  const [contacts, setContactsState] = useState<Contact[]>([]);
  useEffect(() => setContactsState(loadContacts()), []);
  const setContacts = (c: Contact[]) => {
    setContactsState(c);
    saveContacts(c);
  };

  const { data: planIds, refetch: refetchIds } = useReadContract({
    address: SPLIT_REMIT,
    abi: splitRemitAbi,
    functionName: "plansOf",
    args: address ? [address] : undefined,
    query: { enabled: configured && !!address },
  });

  const { data: planData, refetch: refetchPlans } = useReadContracts({
    contracts: (planIds ?? []).map((id) => ({
      address: SPLIT_REMIT,
      abi: splitRemitAbi,
      functionName: "getPlan" as const,
      args: [id] as const,
    })),
    query: { enabled: configured && (planIds?.length ?? 0) > 0 },
  });

  const plans: PlanView[] = useMemo(() => {
    if (!planIds || !planData) return [];
    return planData
      .map((res, i): PlanView | null => {
        if (res.status !== "success") return null;
        const [, active, name, recipients, sharesBps] = res.result as unknown as [
          string,
          boolean,
          string,
          readonly `0x${string}`[],
          readonly number[],
        ];
        return { id: planIds[i], name, active, recipients, sharesBps: sharesBps.map(Number) };
      })
      .filter((p): p is PlanView => p !== null && p.active);
  }, [planIds, planData]);

  const refetch = () => {
    void refetchIds();
    void refetchPlans();
  };

  return (
    <PageShell className="space-y-6 py-6 sm:space-y-8 sm:py-10">
      <div>
        <h1 className="display-serif text-3xl font-semibold sm:text-4xl">Split it</h1>
        <p className="mt-1 max-w-2xl text-sm leading-relaxed text-muted">
          One transaction fans FXRP out to saved contacts by percentage.
          {configured && (
            <>
              {" "}
              <a
                className="font-semibold text-flare underline"
                href={`${EXPLORER}/address/${SPLIT_REMIT}`}
                target="_blank"
                rel="noreferrer"
              >
                View contract
              </a>
            </>
          )}
        </p>
      </div>

      {!configured && (
        <p className="msg-warn">
          SplitRemit isn’t on-chain in this build yet. You can still save contacts below. After you
          deploy, put the contract address in <span className="mono">app/.env.local</span> as{" "}
          <span className="mono">NEXT_PUBLIC_SPLITREMIT_ADDRESS</span> and restart the app — I
          won’t touch that file.
        </p>
      )}

      {!isConnected && (
        <div className="card space-y-4 p-6 sm:p-8">
          <div>
            <p className="text-lg font-extrabold">Connect your Flare wallet</p>
            <p className="mt-1 text-sm text-muted">Needed to save a plan and run a split. Contacts work without it.</p>
          </div>
          <ConnectWallet size="lg" />
        </div>
      )}

      <div className="grid items-start gap-6 lg:grid-cols-2">
        <div className="space-y-6">
          <ContactsPanel contacts={contacts} setContacts={setContacts} />
          {isConnected && configured ? (
            <CreatePlanPanel contacts={contacts} onCreated={refetch} />
          ) : configured ? null : (
            <div className="card p-6 text-sm text-muted">
              Plans go on-chain once SplitRemit is deployed. Contacts stay in this browser in the
              meantime.
            </div>
          )}
        </div>

        <div className="space-y-6">
          {!configured ? (
            <div className="card p-6 text-sm text-muted sm:p-8">
              Nothing to execute until the contract address is set. Minting still works — split
              comes online after deploy.
            </div>
          ) : !isConnected ? (
            <div className="card p-6 text-sm text-muted sm:p-8">
              Connect to load your on-chain plans.
            </div>
          ) : plans.length === 0 ? (
              <div className="card p-6 text-sm text-muted sm:p-8">
                No active plans yet. Create one on the left — then any incoming mint can be split in
                a single tap.
              </div>
            ) : (
              plans.map((plan) => (
                <div key={plan.id.toString()} className="card p-5 sm:p-6">
                  <div className="flex items-start justify-between gap-3">
                    <h3 className="text-lg font-extrabold">{plan.name}</h3>
                    <span className="mono shrink-0 text-xs text-muted">#{plan.id.toString()}</span>
                  </div>
                  <div className="mt-3 space-y-1 text-sm">
                    {plan.recipients.map((r, i) => (
                      <div key={r} className="flex justify-between gap-3">
                        <span className="mono truncate text-muted">{shortAddr(r, 8)}</span>
                        <span className="font-bold">{plan.sharesBps[i] / 100}%</span>
                      </div>
                    ))}
                  </div>
                  <ExecutePanel plan={plan} contacts={contacts} onDone={refetch} />
                </div>
              ))
            )}
          </div>
        </div>
    </PageShell>
  );
}
