import { Request, Response, NextFunction } from 'express'

import getPaymentInfoFromDatabase from '../services/paymentPointers'

/**
 * Resolves inbound requests to a payment pointer to their
 * respective ledger addresses or other payment information required.
 */
export default async function getPaymentInfo(
  req: Request,
  res: Response,
  next: NextFunction,
  getPaymentInfoFromPaymentPointer = getPaymentInfoFromDatabase,
): Promise<void> {
  // TODO:(hbergren) remove these hardcoded values
  const currency = 'XRP'

  /**
   * NOTE: if you plan to expose your payment pointer with a port number, you
   * should use:
   *  const paymentPointerUrl =
   *  `${req.protocol}://${req.hostname}:${Config.publicAPIPort}${req.originalUrl}`
   */
  // TODO(aking): stop hardcoding HTTPS. We should at minimum be using ${req.protocol}
  // TODO:(hbergren) Write a helper function for this and test it?
  const paymentPointer = `https://${req.hostname}${req.originalUrl}`

  // TODO:(hbergren) Assert this is some sort of json header?
  // TODO:(hbergren) Label this magical regex (splits `application/xrpl-mainnet+json` => ['application', 'xrpl', 'mainnet', 'json'])
  // TODO:(hbergren) Refactor this parsing library to a static method or even a utils class.
  // If you do that, then you can easily unit test this bit of logic. You can then change out the implementation of the method easily since it will be encapsulated.
  const acceptHeader = req?.get('Accept')?.split(/\/|-|\+/) || []

  // TODO:(hbergren) Should be <= 2, need to support application/xrpl-json
  // TODO:(hbergren) Should not have a check on XRPL
  if (acceptHeader.length <= 3 || acceptHeader[1] !== 'xrpl') {
    // TODO:(hbergren) Return res directly instead of next()?
    res
      .status(400)
      .send(
        'Invalid Accept header. Must be of the form "application/xrpl-{network}+json"',
      )
    return next()
  }
  // TODO:(hbergren) This should be null
  let network = 'TESTNET'

  // TODO: If Accept is just application/json, just return all addresses, for all networks?
  // We asked for `application/xrpl-{network}+json`
  if (acceptHeader[2] !== 'json') {
    network = acceptHeader[2].toUpperCase()
  }

  // Get the paymentInformation from the database
  const paymentInformation = await getPaymentInfoFromPaymentPointer(
    paymentPointer,
    currency,
    network,
  )

  // TODO:(hbergren) Distinguish between missing payment pointer in system, and missing address for currency/network.
  // TODO:(hbergren) Set response Content-Type header to be the same as Accept header?
  // Or is `application/json` the appropriate response Content-Type?
  if (paymentInformation === undefined) {
    res
      .status(404)
      .send(
        `Payment information for ${paymentPointer} in ${currency} on ${network} could not be found.`,
      )

    return next()
  }

  // TODO:(hbergren) This needs to come from the database.
  paymentInformation.network = `xrpl-${network.toLowerCase()}`

  res.send(paymentInformation)
  return next()
}