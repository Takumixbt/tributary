/**
 * The borrowing side of the demo: the agent draws working capital from its
 * credit line in the TributaryVault.
 *
 * Usage: pnpm draw [usdcAmount]
 */
import { formatUnits, parseUnits } from "viem";
import { publicClient, walletFor, VAULT, requireAddress } from "./config.ts";
import { vaultAbi } from "./abi.ts";

const vault = requireAddress(VAULT, "VAULT_ADDRESS");
const { account, client } = walletFor("AGENT_PRIVATE_KEY");
const amount = parseUnits(process.argv[2] ?? "0.1", 6);

const line = await publicClient.readContract({
  address: vault,
  abi: vaultAbi,
  functionName: "lines",
  args: [account.address],
});
console.log(
  `Line: limit ${formatUnits(line[1], 6)} USDC, principal ${formatUnits(line[2], 6)}, ` +
    `APR ${line[5] / 100}%, active=${line[7]}`,
);

const hash = await client.writeContract({
  address: vault,
  abi: vaultAbi,
  functionName: "draw",
  args: [amount],
  account,
});
const receipt = await publicClient.waitForTransactionReceipt({ hash });
console.log(`draw(${formatUnits(amount, 6)} USDC) tx ${hash} (${receipt.status})`);

const [debt] = await publicClient.readContract({
  address: vault,
  abi: vaultAbi,
  functionName: "debtInfo",
  args: [account.address],
});
console.log(`Current debt: ${formatUnits(debt, 6)} USDC`);
