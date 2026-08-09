import { expect } from "chai";
import { ethers } from "hardhat";
import { loadFixture } from "@nomicfoundation/hardhat-toolbox/network-helpers";
import type { SplitRemit, MockERC20 } from "../typechain-types";

const BPS = 10_000;
const AD_HOC = ethers.MaxUint256;

describe("SplitRemit", () => {
  async function deployFixture() {
    const [sender, mum, rent, savings, stranger] = await ethers.getSigners();

    const token = (await (
      await ethers.getContractFactory("MockERC20")
    ).deploy("FTestXRP", "FTestXRP", 6)) as unknown as MockERC20;

    const splitRemit = (await (
      await ethers.getContractFactory("SplitRemit")
    ).deploy()) as unknown as SplitRemit;

    // 1,000 FXRP (6 decimals) for the sender
    await token.mint(sender.address, 1_000_000_000n);
    await token.connect(sender).approve(await splitRemit.getAddress(), ethers.MaxUint256);

    return { splitRemit, token, sender, mum, rent, savings, stranger };
  }

  describe("createPlan", () => {
    it("stores the plan, indexes it by owner and emits PlanCreated", async () => {
      const { splitRemit, sender, mum, rent, savings } = await loadFixture(deployFixture);

      const recipients = [mum.address, rent.address, savings.address];
      const shares = [5000, 3000, 2000];

      await expect(splitRemit.createPlan("Family — Lagos", recipients, shares))
        .to.emit(splitRemit, "PlanCreated")
        .withArgs(0, sender.address, "Family — Lagos", recipients, shares);

      expect(await splitRemit.planCount()).to.equal(1);
      expect(await splitRemit.plansOf(sender.address)).to.deep.equal([0n]);

      const plan = await splitRemit.getPlan(0);
      expect(plan.owner).to.equal(sender.address);
      expect(plan.active).to.equal(true);
      expect(plan.name).to.equal("Family — Lagos");
      expect(plan.recipients).to.deep.equal(recipients);
      expect(plan.sharesBps.map(Number)).to.deep.equal(shares);
    });

    it("rejects invalid share configurations", async () => {
      const { splitRemit, mum, rent } = await loadFixture(deployFixture);

      await expect(splitRemit.createPlan("x", [], [])).to.be.revertedWithCustomError(
        splitRemit,
        "NoRecipients"
      );
      await expect(
        splitRemit.createPlan("x", [mum.address, rent.address], [BPS])
      ).to.be.revertedWithCustomError(splitRemit, "LengthMismatch");
      await expect(
        splitRemit.createPlan("x", [mum.address], [BPS - 1])
      ).to.be.revertedWithCustomError(splitRemit, "SharesMustSumTo10000");
      await expect(
        splitRemit.createPlan("x", [mum.address, rent.address], [BPS, 1])
      ).to.be.revertedWithCustomError(splitRemit, "SharesMustSumTo10000");
      await expect(
        splitRemit.createPlan("x", [ethers.ZeroAddress], [BPS])
      ).to.be.revertedWithCustomError(splitRemit, "ZeroRecipient");
      await expect(
        splitRemit.createPlan("x", [mum.address, rent.address], [BPS, 0])
      ).to.be.revertedWithCustomError(splitRemit, "ZeroShare");

      const many = Array.from({ length: 21 }, () => mum.address);
      const manyShares = Array.from({ length: 21 }, (_, i) => (i === 0 ? BPS - 20 : 1));
      await expect(splitRemit.createPlan("x", many, manyShares)).to.be.revertedWithCustomError(
        splitRemit,
        "TooManyRecipients"
      );
    });
  });

  describe("deactivatePlan", () => {
    it("only the owner can deactivate, and only once", async () => {
      const { splitRemit, token, mum, rent, stranger } = await loadFixture(deployFixture);
      await splitRemit.createPlan("p", [mum.address, rent.address], [6000, 4000]);

      await expect(splitRemit.connect(stranger).deactivatePlan(0)).to.be.revertedWithCustomError(
        splitRemit,
        "NotPlanOwner"
      );
      await expect(splitRemit.deactivatePlan(0)).to.emit(splitRemit, "PlanDeactivated");
      await expect(splitRemit.deactivatePlan(0)).to.be.revertedWithCustomError(
        splitRemit,
        "PlanNotActive"
      );
      await expect(
        splitRemit.executePlan(0, await token.getAddress(), 1000)
      ).to.be.revertedWithCustomError(splitRemit, "PlanNotActive");
      await expect(splitRemit.deactivatePlan(99)).to.be.revertedWithCustomError(
        splitRemit,
        "UnknownPlan"
      );
    });
  });

  describe("executePlan", () => {
    it("distributes exact proportional amounts", async () => {
      const { splitRemit, token, sender, mum, rent, savings } = await loadFixture(deployFixture);
      await splitRemit.createPlan(
        "Family",
        [mum.address, rent.address, savings.address],
        [5000, 3000, 2000]
      );

      const total = 100_000_000n; // 100 FXRP
      await expect(splitRemit.executePlan(0, await token.getAddress(), total))
        .to.emit(splitRemit, "SplitExecuted")
        .withArgs(0, sender.address, await token.getAddress(), total);

      expect(await token.balanceOf(mum.address)).to.equal(50_000_000n);
      expect(await token.balanceOf(rent.address)).to.equal(30_000_000n);
      expect(await token.balanceOf(savings.address)).to.equal(20_000_000n);
      expect(await token.balanceOf(sender.address)).to.equal(900_000_000n);
    });

    it("assigns rounding dust to the first recipient so nothing is lost", async () => {
      const { splitRemit, token, mum, rent, savings } = await loadFixture(deployFixture);
      await splitRemit.createPlan(
        "Thirds",
        [mum.address, rent.address, savings.address],
        [3334, 3333, 3333]
      );

      const total = 100n; // indivisible by three shares
      await splitRemit.executePlan(0, await token.getAddress(), total);

      const [a, b, c] = await Promise.all([
        token.balanceOf(mum.address),
        token.balanceOf(rent.address),
        token.balanceOf(savings.address),
      ]);
      expect(b).to.equal(33n);
      expect(c).to.equal(33n);
      expect(a).to.equal(34n); // floor shares + dust
      expect(a + b + c).to.equal(total);
    });

    it("matches previewSplit exactly", async () => {
      const { splitRemit, token, mum, rent, savings } = await loadFixture(deployFixture);
      const shares = [1234, 4321, 4445];
      await splitRemit.createPlan("p", [mum.address, rent.address, savings.address], shares);

      const total = 987_654_321n % 500_000_000n;
      const preview = await splitRemit.previewSplit(total, shares);
      await splitRemit.executePlan(0, await token.getAddress(), total);

      expect(await token.balanceOf(mum.address)).to.equal(preview[0]);
      expect(await token.balanceOf(rent.address)).to.equal(preview[1]);
      expect(await token.balanceOf(savings.address)).to.equal(preview[2]);
    });

    it("lets anyone fund someone else's plan with their own tokens", async () => {
      const { splitRemit, token, mum, rent, stranger } = await loadFixture(deployFixture);
      await splitRemit.createPlan("p", [mum.address, rent.address], [7000, 3000]);

      await token.mint(stranger.address, 10_000_000n);
      await token.connect(stranger).approve(await splitRemit.getAddress(), ethers.MaxUint256);

      await splitRemit.connect(stranger).executePlan(0, await token.getAddress(), 10_000_000n);
      expect(await token.balanceOf(mum.address)).to.equal(7_000_000n);
      expect(await token.balanceOf(rent.address)).to.equal(3_000_000n);
      expect(await token.balanceOf(stranger.address)).to.equal(0n);
    });

    it("reverts on zero amount, unknown plan and missing allowance", async () => {
      const { splitRemit, token, mum, rent, stranger } = await loadFixture(deployFixture);
      await splitRemit.createPlan("p", [mum.address, rent.address], [6000, 4000]);
      const tokenAddr = await token.getAddress();

      await expect(splitRemit.executePlan(0, tokenAddr, 0)).to.be.revertedWithCustomError(
        splitRemit,
        "ZeroAmount"
      );
      await expect(splitRemit.executePlan(42, tokenAddr, 1)).to.be.revertedWithCustomError(
        splitRemit,
        "UnknownPlan"
      );

      await token.mint(stranger.address, 1_000_000n);
      // no approval from stranger
      await expect(splitRemit.connect(stranger).executePlan(0, tokenAddr, 1_000_000n)).to.be
        .reverted;
    });
  });

  describe("splitNow", () => {
    it("performs a validated ad hoc split with the ad hoc plan id sentinel", async () => {
      const { splitRemit, token, sender, mum, rent } = await loadFixture(deployFixture);
      const total = 9_999_999n;

      await expect(
        splitRemit.splitNow(await token.getAddress(), total, [mum.address, rent.address], [5000, 5000])
      )
        .to.emit(splitRemit, "SplitExecuted")
        .withArgs(AD_HOC, sender.address, await token.getAddress(), total);

      const a = await token.balanceOf(mum.address);
      const b = await token.balanceOf(rent.address);
      expect(b).to.equal(4_999_999n);
      expect(a).to.equal(5_000_000n);
      expect(a + b).to.equal(total);
    });

    it("applies the same validation as saved plans", async () => {
      const { splitRemit, token, mum } = await loadFixture(deployFixture);
      await expect(
        splitRemit.splitNow(await token.getAddress(), 100, [mum.address], [9999])
      ).to.be.revertedWithCustomError(splitRemit, "SharesMustSumTo10000");
    });
  });

  describe("getPlan", () => {
    it("reverts for unknown plan ids", async () => {
      const { splitRemit } = await loadFixture(deployFixture);
      await expect(splitRemit.getPlan(0)).to.be.revertedWithCustomError(splitRemit, "UnknownPlan");
    });
  });
});
