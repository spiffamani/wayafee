"use client";

import { useEffect, useMemo, useState } from "react";
import { isAddress, zeroAddress } from "viem";
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

// ---------------------------------------------------------------- contacts

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
    <div className="card p-6 space-y-4">
      <div>
        <h2 className="font-semibold">Saved contacts</h2>
        <p className="text-xs text-gray-500 mt-1">
          Stored only in this browser — no backend, by design.
        </p>
      </div>
      <div className="space-y-2">
        {contacts.length === 0 && (
          <p className="text-sm text-gray-500">No contacts yet. Add the people you send to.</p>
        )}
        {contacts.map((c) => (
          <div key={c.address} className="flex items-center justify-between text-sm">
            <div>
              <p className="font-medium">{c.name}</p>
              <p className="mono text-xs text-gray-500">{shortAddr(c.address, 8)}</p>
            </div>
            <button
              className="text-xs text-gray-500 hover:text-red-400"
              onClick={() => setContacts(contacts.filter((x) => x.address !== c.address))}
            >
              remove
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
          className="input text-sm mono"
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

// ------------------------------------------------------------- create plan

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
      // fix rounding: force sum to exactly 10000 on the first entry
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
    <div className="card p-6 space-y-4">
      <div>
        <h2 className="font-semibold">New split plan</h2>
        <p className="text-xs text-gray-500 mt-1">
          Percentages must total 100. Saved on-chain — reusable for every future mint.
        </p>
      </div>
      <input
        className="input text-sm"
        placeholder='Plan name (e.g. "Family — Lagos")'
        value={planName}
        onChange={(e) => setPlanName(e.target.value)}
      />
      {contacts.length === 0 ? (
        <p className="text-sm text-gray-500">Add contacts first.</p>
      ) : (
        <div className="space-y-2">
          {contacts.map((c) => (
            <div key={c.address} className="flex items-center gap-3 text-sm">
              <span className="flex-1">{c.name}</span>
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
              <span className="text-gray-500 w-4">%</span>
            </div>
          ))}
          <p
            className={`text-xs text-right ${
              Math.abs(totalPct - 100) < 1e-9 ? "text-mint" : "text-amber"
            }`}
          >
            total {totalPct}%
          </p>
        </div>
      )}
      {error && <p className="text-sm text-red-400 break-all">{error}</p>}
      <button className="btn-primary w-full" disabled={!valid || busy !== null} onClick={create}>
        {busy ?? "Save plan on-chain"}
      </button>
    </div>
  );
}

// ------------------------------------------------------------- plans list

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
    <div className="space-y-3 border-t border-line pt-4 mt-4">
      <div className="flex items-center gap-3">
        <input
          className="input text-sm"
          placeholder="Amount of FXRP to split"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
        />
        {balance !== undefined && (
          <button
            className="text-xs text-flare whitespace-nowrap underline"
            onClick={() => setAmount(formatFxrp(balance))}
          >
            max {formatFxrp(balance)}
          </button>
        )}
      </div>
      {preview && (
        <div className="text-xs text-gray-400 space-y-1">
          {plan.recipients.map((r, i) => (
            <div key={r} className="flex justify-between">
              <span>
                {nameOf(r)} · {plan.sharesBps[i] / 100}%
              </span>
              <span className="mono">{formatFxrp(preview[i])} FXRP</span>
            </div>
          ))}
        </div>
      )}
      {error && <p className="text-sm text-red-400 break-all">{error}</p>}
      {doneTx && (
        <p className="text-sm text-mint">
          Split executed —{" "}
          <a className="underline" href={`${EXPLORER}/tx/${doneTx}`} target="_blank" rel="noreferrer">
            view transaction ↗
          </a>
        </p>
      )}
      <button
        className="btn-primary w-full text-sm"
        disabled={parsed === null || parsed === 0n || busy !== null}
        onClick={execute}
      >
        {busy ?? "Split now (one atomic transaction)"}
      </button>
    </div>
  );
}

// ------------------------------------------------------------------ page

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

  if (!configured) {
    return (
      <div className="card p-8 text-center space-y-3 max-w-xl mx-auto">
        <h1 className="text-xl font-bold">SplitRemit not deployed yet</h1>
        <p className="text-sm text-gray-400">
          Deploy the contract (<span className="mono">npm run deploy:coston2 -w contracts</span>)
          and set <span className="mono">NEXT_PUBLIC_SPLITREMIT_ADDRESS</span> in{" "}
          <span className="mono">app/.env.local</span>.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold">SplitRemit</h1>
        <p className="text-sm text-gray-400">
          One transaction fans FXRP out to your saved contacts by percentage — the remittance half
          of Wayafee, and our own audited-by-tests contract.{" "}
          <a
            className="text-flare underline"
            href={`${EXPLORER}/address/${SPLIT_REMIT}`}
            target="_blank"
            rel="noreferrer"
          >
            view on explorer ↗
          </a>
        </p>
      </div>

      {!isConnected && (
        <div className="card p-6 text-center text-gray-400">
          Connect your Flare wallet above to manage plans.
        </div>
      )}

      {isConnected && (
        <div className="grid lg:grid-cols-2 gap-6 items-start">
          <div className="space-y-6">
            <ContactsPanel contacts={contacts} setContacts={setContacts} />
            <CreatePlanPanel contacts={contacts} onCreated={refetch} />
          </div>

          <div className="space-y-6">
            {plans.length === 0 ? (
              <div className="card p-6 text-sm text-gray-500">
                No active plans yet. Create one on the left — then any incoming mint can be split
                in a single click.
              </div>
            ) : (
              plans.map((plan) => (
                <div key={plan.id.toString()} className="card p-6">
                  <div className="flex items-center justify-between">
                    <h3 className="font-semibold">{plan.name}</h3>
                    <span className="text-xs text-gray-500 mono">plan #{plan.id.toString()}</span>
                  </div>
                  <div className="text-xs text-gray-400 mt-2 space-y-1">
                    {plan.recipients.map((r, i) => (
                      <div key={r} className="flex justify-between">
                        <span className="mono">{shortAddr(r, 8)}</span>
                        <span>{plan.sharesBps[i] / 100}%</span>
                      </div>
                    ))}
                  </div>
                  <ExecutePanel plan={plan} contacts={contacts} onDone={refetch} />
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
