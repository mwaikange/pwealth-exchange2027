"use client"

import { useState, useEffect } from "react"
import {
  Box,
  Button,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  TextField,
  Typography,
  Grid,
  Paper,
  CircularProgress,
} from "@mui/material"
import { styled } from "@mui/material/styles"

const Item = styled(Paper)(({ theme }) => ({
  backgroundColor: theme.palette.mode === "dark" ? "#1A2027" : "#fff",
  ...theme.typography.body2,
  padding: theme.spacing(1),
  textAlign: "center",
  color: theme.palette.text.secondary,
}))

const ExchangePage = () => {
  const [buyWalletBalance, setBuyWalletBalance] = useState(0)
  const [holdWalletPreHoldBalance, setHoldWalletPreHoldBalance] = useState(0)
  const [holdWalletPostHoldBalance, setHoldWalletPostHoldBalance] = useState(0)
  const [sharesToBuy, setSharesToBuy] = useState("")
  const [sharesToSell, setSharesToSell] = useState("")
  const [selectedShare, setSelectedShare] = useState("")
  const [availableShares, setAvailableShares] = useState(["Share A", "Share B", "Share C"]) // Example shares
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [successMessage, setSuccessMessage] = useState("")

  useEffect(() => {
    // Mock API call to fetch wallet balances
    const fetchWalletBalances = async () => {
      setLoading(true)
      try {
        // Simulate API response
        const response = {
          buyWalletBalance: 1000, // NAD
          holdWalletPreHoldBalance: 500, // shares available for vesting
          holdWalletPostHoldBalance: 200, // shares ready for trading
        }

        setBuyWalletBalance(response.buyWalletBalance)
        setHoldWalletPreHoldBalance(response.holdWalletPreHoldBalance)
        setHoldWalletPostHoldBalance(response.holdWalletPostHoldBalance)
        setError("")
      } catch (e: any) {
        setError("Failed to fetch wallet balances.")
        console.error(e)
      } finally {
        setLoading(false)
      }
    }

    fetchWalletBalances()
  }, [])

  const handleBuyShares = async () => {
    if (!selectedShare) {
      setError("Please select a share to buy.")
      return
    }

    if (!sharesToBuy || isNaN(Number(sharesToBuy)) || Number(sharesToBuy) <= 0) {
      setError("Please enter a valid number of shares to buy.")
      return
    }

    const sharesToBuyNumber = Number(sharesToBuy)

    if (buyWalletBalance < sharesToBuyNumber * 50) {
      setError("Insufficient NAD balance in Buy Wallet.")
      return
    }

    setLoading(true)
    setError("")
    setSuccessMessage("")

    try {
      // Simulate API call to buy shares
      // Replace with actual API endpoint
      await new Promise((resolve) => setTimeout(resolve, 1000)) // Simulate API delay

      // Update wallet balances (optimistically)
      setBuyWalletBalance(buyWalletBalance - sharesToBuyNumber * 50)
      setHoldWalletPreHoldBalance(holdWalletPreHoldBalance + sharesToBuyNumber)

      setSuccessMessage(`${sharesToBuyNumber} shares of ${selectedShare} bought successfully.`)
      setSharesToBuy("")
    } catch (e: any) {
      setError("Failed to buy shares.")
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  const handleSellShares = async () => {
    if (!selectedShare) {
      setError("Please select a share to sell.")
      return
    }

    if (!sharesToSell || isNaN(Number(sharesToSell)) || Number(sharesToSell) <= 0) {
      setError("Please enter a valid number of shares to sell.")
      return
    }

    const sharesToSellNumber = Number(sharesToSell)

    if (holdWalletPostHoldBalance < sharesToSellNumber) {
      setError("Insufficient shares in Hold Wallet Post-Hold.")
      return
    }

    setLoading(true)
    setError("")
    setSuccessMessage("")

    try {
      // Simulate API call to sell shares
      // Replace with actual API endpoint
      await new Promise((resolve) => setTimeout(resolve, 1000)) // Simulate API delay

      // Update wallet balances (optimistically)
      setBuyWalletBalance(buyWalletBalance + sharesToSellNumber * 50)
      setHoldWalletPostHoldBalance(holdWalletPostHoldBalance - sharesToSellNumber)

      setSuccessMessage(`${sharesToSellNumber} shares of ${selectedShare} sold successfully.`)
      setSharesToSell("")
    } catch (e: any) {
      setError("Failed to sell shares.")
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  return (
    <Box sx={{ flexGrow: 1, padding: 3 }}>
      <Typography variant="h4" gutterBottom>
        Shares Exchange
      </Typography>

      <Grid container spacing={2}>
        <Grid item xs={12} sm={4}>
          <Item>
            <Typography variant="h6">Buy Wallet (NAD)</Typography>
            <Typography variant="body1">Balance: N${buyWalletBalance.toFixed(2)}</Typography>
          </Item>
        </Grid>
        <Grid item xs={12} sm={4}>
          <Item>
            <Typography variant="h6">Hold Wallet Pre-Hold (shares available for vesting)</Typography>
            <Typography variant="body1">Balance: {holdWalletPreHoldBalance}</Typography>
          </Item>
        </Grid>
        <Grid item xs={12} sm={4}>
          <Item>
            <Typography variant="h6">Hold Wallet Post-Hold (shares ready for trading)</Typography>
            <Typography variant="body1">Balance: {holdWalletPostHoldBalance}</Typography>
          </Item>
        </Grid>
      </Grid>

      <Box mt={3}>
        <FormControl fullWidth>
          <InputLabel id="select-share-label">Select Share</InputLabel>
          <Select
            labelId="select-share-label"
            id="select-share"
            value={selectedShare}
            label="Select Share"
            onChange={(e) => setSelectedShare(e.target.value)}
          >
            {availableShares.map((share) => (
              <MenuItem key={share} value={share}>
                {share}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
      </Box>

      <Grid container spacing={2} mt={2}>
        <Grid item xs={12} md={6}>
          <Item>
            <Typography variant="h6">Buy Shares</Typography>
            <TextField
              fullWidth
              label="Shares to Buy"
              value={sharesToBuy}
              onChange={(e) => setSharesToBuy(e.target.value)}
              margin="normal"
              type="number"
              inputProps={{ min: 0 }}
            />
            <Button variant="contained" color="primary" onClick={handleBuyShares} disabled={loading}>
              {loading ? <CircularProgress size={24} /> : "Buy Shares"}
            </Button>
          </Item>
        </Grid>
        <Grid item xs={12} md={6}>
          <Item>
            <Typography variant="h6">Sell Shares</Typography>
            <TextField
              fullWidth
              label="Shares to Sell"
              value={sharesToSell}
              onChange={(e) => setSharesToSell(e.target.value)}
              margin="normal"
              type="number"
              inputProps={{ min: 0 }}
            />
            <Button variant="contained" color="secondary" onClick={handleSellShares} disabled={loading}>
              {loading ? <CircularProgress size={24} /> : "Sell Shares"}
            </Button>
          </Item>
        </Grid>
      </Grid>

      {error && (
        <Typography color="error" mt={2}>
          {error}
        </Typography>
      )}

      {successMessage && (
        <Typography color="success" mt={2}>
          {successMessage}
        </Typography>
      )}
    </Box>
  )
}

export default ExchangePage
