"use client"

import type React from "react"
import { Box, Flex, Heading, Spacer, useColorMode, IconButton } from "@chakra-ui/react"
import { FaSun, FaMoon, FaGithub, FaLinkedin } from "react-icons/fa"

const Header: React.FC = () => {
  const { colorMode, toggleColorMode } = useColorMode()
  const isDark = colorMode === "dark"

  return (
    <Flex
      as="nav"
      align="center"
      justify="space-between"
      wrap="wrap"
      padding="1.5rem"
      bg={isDark ? "gray.800" : "gray.100"}
      color={isDark ? "gray.100" : "gray.800"}
    >
      <Flex align="center" mr={5}>
        <Heading as="h1" size="lg" letterSpacing={"-.1rem"}>
          Peer Wealth Platforms
        </Heading>
      </Flex>

      <Spacer />

      <Box>
        <IconButton ml={2} icon={isDark ? <FaSun /> : <FaMoon />} isRound="true" onClick={toggleColorMode}></IconButton>
        <IconButton
          ml={2}
          icon={<FaGithub />}
          isRound="true"
          onClick={() => window.open("https://github.com/")}
        ></IconButton>
        <IconButton
          ml={2}
          icon={<FaLinkedin />}
          isRound="true"
          onClick={() => window.open("https://linkedin.com/")}
        ></IconButton>
      </Box>
    </Flex>
  )
}

export default Header
